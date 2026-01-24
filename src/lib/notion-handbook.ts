import { unstable_cache } from 'next/cache';
import type { HandbookSection, HandbookImage, Course, NotionBlock } from './types';
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
 * Fetch all sections from a handbook database
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

    // Extract Page Range (rich_text)
    let pageRange = '';
    if ('Page Range' in props && props['Page Range'].type === 'rich_text') {
      const richTextArray = props['Page Range'].rich_text;
      if (richTextArray && richTextArray.length > 0) {
        pageRange = richTextArray[0].plain_text;
      }
    }

    // Calculate order from page range
    const order = parsePageRangeForOrder(pageRange);

    sections.push({
      id: page.id,
      name,
      pageRange,
      order,
      images: [], // Will be populated separately
    });
  }

  // Sort by order (page range)
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
 * Fetch all content (blocks + images) from a handbook section page
 */
async function fetchSectionContent(client: any, pageId: string): Promise<SectionContent> {
  const images: HandbookImage[] = [];
  const blocks: NotionBlock[] = [];

  // Fetch all blocks from the page
  const response = await client.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  for (const block of response.results) {
    if (!('type' in block)) continue;

    // Store the raw block for NotionRenderer
    blocks.push(block as NotionBlock);

    // Also extract images separately for backwards compatibility
    if (block.type === 'image' && 'image' in block) {
      const imageBlock = block.image;
      let url = '';
      let caption = '';

      // Get image URL
      if (imageBlock.type === 'external' && imageBlock.external) {
        url = imageBlock.external.url;
      } else if (imageBlock.type === 'file' && imageBlock.file) {
        url = imageBlock.file.url;
      }

      // Get caption
      if (imageBlock.caption && imageBlock.caption.length > 0) {
        caption = imageBlock.caption.map((c: any) => c.plain_text).join('');
      }

      if (url) {
        images.push({ url, caption });
      }
    }
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

      // Extract Name
      let name = 'Untitled';
      if ('Name' in props && props.Name.type === 'title') {
        const titleArray = props.Name.title;
        if (titleArray && titleArray.length > 0) {
          name = titleArray[0].plain_text;
        }
      }

      // Extract Page Range
      let pageRange = '';
      if ('Page Range' in props && props['Page Range'].type === 'rich_text') {
        const richTextArray = props['Page Range'].rich_text;
        if (richTextArray && richTextArray.length > 0) {
          pageRange = richTextArray[0].plain_text;
        }
      }

      // Fetch all content (images + blocks)
      const { images, blocks } = await fetchSectionContent(client, sectionId);

      return {
        id: sectionId,
        name,
        pageRange,
        order: parsePageRangeForOrder(pageRange),
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
