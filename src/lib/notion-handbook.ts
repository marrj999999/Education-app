import { unstable_cache } from 'next/cache';
import type { HandbookSection, HandbookImage, Course, NotionBlock, ChapterGroup, ChapterColorScheme } from './types';
import { CHAPTER_COLORS } from './types';
import { getNotionClient, getDefaultNotionClient } from './notion-client';

// Cache tags
const CACHE_TAGS = {
  handbook: 'handbook',
  handbookSection: 'handbook-section',
};

/**
 * Parse page range text (e.g., "4" or "13-17") to extract order
 */
function parsePageRangeForOrder(pageRange: string): number {
  if (!pageRange) return 999;
  const cleaned = pageRange.trim();
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    return parseInt(parts[0].trim(), 10) || 999;
  }
  return parseInt(cleaned, 10) || 999;
}

/**
 * Extract rich text value from Notion property
 */
function extractRichText(props: any, propertyName: string): string {
  if (propertyName in props && props[propertyName].type === 'rich_text') {
    const richTextArray = props[propertyName].rich_text;
    if (richTextArray && richTextArray.length > 0) {
      return richTextArray[0].plain_text;
    }
  }
  return '';
}

/**
 * Fetch all sections from a handbook database
 * Supports both old schema (Name, Page Range) and new Urban Arrow schema
 * (Name, Order, Section, Chapter, Icon, Has Video, Status, Slug, Est. Time)
 */
async function fetchHandbookSections(client: any, databaseId: string, apiKey?: string): Promise<HandbookSection[]> {

  // Query the database for all pages using direct fetch
  // The Notion SDK v5.7+ removed databases.query, so we use the REST API directly
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Notion API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();

  const sections: HandbookSection[] = [];

  for (const page of data.results) {
    if (!('properties' in page)) continue;

    const props = page.properties;

    // Extract Name (title)
    let name = 'Untitled';
    if ('Name' in props && props.Name.type === 'title') {
      const titleArray = props.Name.title;
      if (titleArray && titleArray.length > 0) {
        name = titleArray[0].plain_text;
      }
    }

    // Extract Page Range (rich_text) - legacy support
    const pageRange = extractRichText(props, 'Page Range');

    // Extract Order (number) - new schema
    let order = 999;
    if ('Order' in props && props.Order.type === 'number' && props.Order.number !== null) {
      order = props.Order.number;
    } else if ('Section Number' in props && props['Section Number'].type === 'number' && props['Section Number'].number !== null) {
      // Fallback to "Section Number" property
      order = props['Section Number'].number;
    } else {
      // Fallback to page range parsing for legacy databases
      order = parsePageRangeForOrder(pageRange);
    }

    // Extract Section (rich_text) - e.g., "1.0", "1.1"
    const section = extractRichText(props, 'Section');

    // Extract Chapter (select) - e.g., "Introduction", "Getting Started"
    let chapter = '';
    if ('Chapter' in props && props.Chapter.type === 'select' && props.Chapter.select) {
      chapter = props.Chapter.select.name;
    }

    // Extract Icon (rich_text) - emoji or icon
    const icon = extractRichText(props, 'Icon');

    // Extract Slug (rich_text) - URL-friendly identifier
    let slug = extractRichText(props, 'Slug');
    // Fallback: generate slug from name if not provided
    if (!slug && name !== 'Untitled') {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Extract Has Video (checkbox)
    let hasVideo = false;
    if ('Has Video' in props && props['Has Video'].type === 'checkbox') {
      hasVideo = props['Has Video'].checkbox;
    }

    // Extract Est. Time (rich_text) - e.g., "3 min"
    const estTime = extractRichText(props, 'Est. Time');

    sections.push({
      id: page.id,
      name,
      pageRange,
      order,
      section,
      chapter,
      icon,
      slug,
      hasVideo,
      estTime,
      images: [], // Will be populated separately
    });
  }

  // Sort by order (should already be sorted by query, but ensure consistency)
  sections.sort((a, b) => a.order - b.order);

  return sections;
}

/**
 * Section content including all blocks and extracted images
 */
interface SectionContent {
  images: HandbookImage[];
  blocks: NotionBlock[];
}

/**
 * Recursively fetch block children up to a max depth
 */
async function fetchBlockChildren(client: any, blockId: string, depth: number = 0, maxDepth: number = 3): Promise<NotionBlock[]> {
  if (depth >= maxDepth) return [];

  const response = await client.blocks.children.list({
    block_id: blockId,
    page_size: 100,
  });

  const blocks: NotionBlock[] = [];

  for (const block of response.results) {
    if (!('type' in block)) continue;

    const notionBlock = block as NotionBlock;

    // Recursively fetch children for blocks that have them
    if (block.has_children) {
      try {
        notionBlock.children = await fetchBlockChildren(client, block.id, depth + 1, maxDepth);
      } catch (error) {
        console.error(`Failed to fetch children for block ${block.id}:`, error);
      }
    }

    blocks.push(notionBlock);
  }

  return blocks;
}

/**
 * Extract image from a block (for backwards compatibility)
 */
function extractImageFromBlock(block: any): HandbookImage | null {
  if (block.type !== 'image' || !('image' in block)) return null;

  const imageBlock = block.image;
  let url = '';
  let caption = '';

  if (imageBlock.type === 'external' && imageBlock.external) {
    url = imageBlock.external.url;
  } else if (imageBlock.type === 'file' && imageBlock.file) {
    url = imageBlock.file.url;
  }

  if (imageBlock.caption && imageBlock.caption.length > 0) {
    caption = imageBlock.caption.map((c: any) => c.plain_text).join('');
  }

  return url ? { url, caption } : null;
}

/**
 * Fetch all content (blocks + images) from a handbook section page
 * Now fetches recursively to support toggles, columns, and nested content
 */
async function fetchSectionContent(client: any, pageId: string): Promise<SectionContent> {
  const blocks = await fetchBlockChildren(client, pageId);

  // Extract images from top-level blocks for backwards compatibility
  const images: HandbookImage[] = [];
  for (const block of blocks) {
    const image = extractImageFromBlock(block);
    if (image) images.push(image);
  }

  return { images, blocks };
}

/**
 * Internal function to fetch handbook data with API key
 */
async function fetchHandbookDataWithApiKey(apiKey: string, databaseId: string): Promise<HandbookSection[]> {
  // Fetch all sections
  const sections = await fetchHandbookSections(null, databaseId, apiKey);

  // Fetch ALL content (blocks + images) for each section in parallel
  // (blocks.children.list still works in SDK v5.7+)
  const client = getNotionClient(apiKey);
  const sectionsWithContent = await Promise.all(
    sections.map(async (section) => {
      try {
        const { images, blocks } = await fetchSectionContent(client, section.id);
        return { ...section, images, blocks };
      } catch (error) {
        console.error(`Failed to fetch content for section ${section.name}:`, error);
        return section;
      }
    })
  );

  return sectionsWithContent;
}

/**
 * Get complete handbook data with sections and images (cached)
 * Legacy function for backwards compatibility - uses default API key
 */
export const getHandbookData = unstable_cache(
  async (databaseId: string): Promise<HandbookSection[]> => {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is not set');
    }
    return fetchHandbookDataWithApiKey(apiKey, databaseId);
  },
  ['notion-handbook-data'],
  { revalidate: 300, tags: [CACHE_TAGS.handbook] }
);

/**
 * Get handbook data for a specific course (supports multi-workspace)
 * This function uses the course's notionApiKey if specified
 */
export async function getHandbookDataForCourse(course: Course): Promise<HandbookSection[]> {
  if (!course.notionDatabaseId) {
    throw new Error(`Course ${course.id} does not have a notionDatabaseId configured`);
  }

  const apiKey = course.notionApiKey || process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(`No Notion API key configured for course: ${course.id}`);
  }

  // Create a course-specific cached function
  const fetchCached = unstable_cache(
    async (): Promise<HandbookSection[]> => {
      return fetchHandbookDataWithApiKey(apiKey, course.notionDatabaseId!);
    },
    [`notion-handbook-${course.id}`],
    { revalidate: 300, tags: [CACHE_TAGS.handbook, `handbook-${course.id}`] }
  );

  return fetchCached();
}

/**
 * Get handbook sections without images (for faster TOC loading)
 */
export const getHandbookTOC = unstable_cache(
  async (databaseId: string): Promise<Omit<HandbookSection, 'images'>[]> => {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is not set');
    }
    const sections = await fetchHandbookSections(null, databaseId, apiKey);
    return sections.map(({ id, name, pageRange, order }) => ({
      id,
      name,
      pageRange,
      order,
    }));
  },
  ['notion-handbook-toc'],
  { revalidate: 300, tags: [CACHE_TAGS.handbook] }
);

/**
 * Extract rich text from page properties (for single section fetch)
 */
function extractRichTextFromPage(props: any, propertyName: string): string {
  if (propertyName in props && props[propertyName].type === 'rich_text') {
    const richTextArray = props[propertyName].rich_text;
    if (richTextArray && richTextArray.length > 0) {
      return richTextArray[0].plain_text;
    }
  }
  return '';
}

/**
 * Get a single section with its content (images + blocks)
 */
export const getHandbookSection = unstable_cache(
  async (sectionId: string): Promise<HandbookSection | null> => {
    const client = getDefaultNotionClient();
    try {
      // Fetch page metadata
      const page = await client.pages.retrieve({ page_id: sectionId });

      if (!('properties' in page)) return null;

      const props = page.properties;

      // Extract Name (title)
      let name = 'Untitled';
      if ('Name' in props && props.Name.type === 'title') {
        const titleArray = props.Name.title;
        if (titleArray && titleArray.length > 0) {
          name = titleArray[0].plain_text;
        }
      }

      // Extract Page Range (legacy)
      const pageRange = extractRichTextFromPage(props, 'Page Range');

      // Extract Order (number) - new schema
      let order = 999;
      if ('Order' in props && props.Order.type === 'number' && props.Order.number !== null) {
        order = props.Order.number;
      } else if ('Section Number' in props && props['Section Number'].type === 'number' && props['Section Number'].number !== null) {
        // Fallback to "Section Number" property
        order = props['Section Number'].number;
      } else {
        order = parsePageRangeForOrder(pageRange);
      }

      // Extract Section (rich_text)
      const section = extractRichTextFromPage(props, 'Section');

      // Extract Chapter (select)
      let chapter = '';
      if ('Chapter' in props && props.Chapter.type === 'select' && props.Chapter.select) {
        chapter = props.Chapter.select.name;
      }

      // Extract Icon (rich_text)
      const icon = extractRichTextFromPage(props, 'Icon');

      // Extract Slug (rich_text)
      let slug = extractRichTextFromPage(props, 'Slug');
      if (!slug && name !== 'Untitled') {
        slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      // Extract Has Video (checkbox)
      let hasVideo = false;
      if ('Has Video' in props && props['Has Video'].type === 'checkbox') {
        hasVideo = props['Has Video'].checkbox;
      }

      // Extract Est. Time (rich_text)
      const estTime = extractRichTextFromPage(props, 'Est. Time');

      // Fetch all content (images + blocks)
      const { images, blocks } = await fetchSectionContent(client, sectionId);

      return {
        id: sectionId,
        name,
        pageRange,
        order,
        section,
        chapter,
        icon,
        slug,
        hasVideo,
        estTime,
        images,
        blocks,
      };
    } catch (error) {
      console.error(`Failed to fetch section ${sectionId}:`, error);
      return null;
    }
  },
  ['notion-handbook-section'],
  { revalidate: 300, tags: [CACHE_TAGS.handbookSection] }
);

/**
 * Default color scheme for chapters not in CHAPTER_COLORS
 */
const DEFAULT_CHAPTER_COLOR: ChapterColorScheme = {
  bg: 'bg-gray-50',
  border: 'border-gray-400',
  text: 'text-gray-700',
  solid: 'bg-gray-500',
};

/**
 * Group sections by chapter for sidebar navigation
 * Maintains section order within each chapter
 */
export function groupSectionsByChapter(sections: HandbookSection[]): ChapterGroup[] {
  const chapterMap = new Map<string, HandbookSection[]>();
  const chapterOrder: string[] = [];

  // Group sections by chapter, preserving order
  for (const section of sections) {
    const chapterName = section.chapter || 'Uncategorized';

    if (!chapterMap.has(chapterName)) {
      chapterMap.set(chapterName, []);
      chapterOrder.push(chapterName);
    }

    chapterMap.get(chapterName)!.push(section);
  }

  // Convert to ChapterGroup array
  return chapterOrder.map(chapterName => ({
    name: chapterName,
    color: CHAPTER_COLORS[chapterName] || DEFAULT_CHAPTER_COLOR,
    sections: chapterMap.get(chapterName)!,
  }));
}

/**
 * Find previous and next sections for navigation
 */
export function findAdjacentSections(
  sections: HandbookSection[],
  currentSlug: string
): { prev: HandbookSection | null; next: HandbookSection | null } {
  const currentIndex = sections.findIndex(s => s.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? sections[currentIndex - 1] : null,
    next: currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null,
  };
}
