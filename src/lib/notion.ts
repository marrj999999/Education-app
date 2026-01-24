import { Client } from '@notionhq/client';
import { unstable_cache } from 'next/cache';
import type {
  NotionBlock,
  NotionPage,
  Module,
  Lesson,
  CourseNavigation,
  NavigationLink,
  Course
} from './types';

// Initialize Notion client with timeout
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  timeoutMs: 30000, // 30 second timeout
});

// Default Page IDs from the Notion workspace (used for backwards compatibility)
const DEFAULT_COURSE_NAV_ID = process.env.NOTION_COURSE_NAV_ID || '19f4c6153ed980429bb7dc3d65091e39';
const DEFAULT_DATABASE_ID = process.env.NOTION_DATABASE_ID || '1c84c6153ed980209372d89b6724ce6e';

// Cache tags for revalidation
const CACHE_TAGS = {
  courseStructure: 'course-structure',
  lesson: 'lesson',
  page: 'page',
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RATE_LIMIT_DELAY = 125; // 8 requests per second - Notion allows higher throughput
const MAX_CONCURRENT_REQUESTS = 5; // Increased concurrency for better performance

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Token bucket rate limiter for better throughput
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerSecond / 1000;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await sleep(waitTime);
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const rateLimiter = new RateLimiter(8); // 8 requests per second for better throughput

// Request deduplication to prevent duplicate API calls
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate requests - if same request is in-flight, return existing promise
 */
function deduplicateRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    console.log(`Deduplicating request: ${key}`);
    return existing;
  }

  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Controlled concurrent execution with rate limiting
 */
async function batchWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = MAX_CONCURRENT_REQUESTS
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = (async () => {
      await rateLimiter.acquire();
      const result = await fn(item);
      results.push(result);
    })();

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      executing.splice(0, executing.findIndex(p => p === promise) + 1);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Retry wrapper for Notion API calls with rate limiting
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  try {
    await rateLimiter.acquire();
    return await fn();
  } catch (error: any) {
    const isRetryable =
      error.code === 'ECONNRESET' ||
      error.code === 'notionhq_client_request_timeout' ||
      error.code === 'rate_limited' ||
      error.status === 429;

    if (retries > 0 && isRetryable) {
      // For rate limits, use the retry-after header if available, otherwise use longer delay
      let retryDelay = delay;
      if (error.status === 429 || error.code === 'rate_limited') {
        const retryAfter = error.headers?.get?.('retry-after');
        retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : Math.max(delay, 3000);
        console.log(`Rate limited, waiting ${retryDelay}ms before retry...`);
      } else {
        console.log(`Notion API error (${error.code}), retrying... (${retries} attempts left)`);
      }

      await sleep(retryDelay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Fetch a page's metadata (internal, uncached)
 * Uses request deduplication to prevent duplicate API calls
 */
async function fetchPage(pageId: string): Promise<NotionPage> {
  return deduplicateRequest(`page:${pageId}`, async () => {
    const response = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));

    // Extract title from properties
    let title = 'Untitled';
    const props = (response as any).properties;
    if (props?.title?.title?.[0]?.plain_text) {
      title = props.title.title[0].plain_text;
    } else if (props?.Name?.title?.[0]?.plain_text) {
      title = props.Name.title[0].plain_text;
    }

    // Extract icon
    let icon: string | undefined;
    const iconData = (response as any).icon;
    if (iconData?.type === 'emoji') {
      icon = iconData.emoji;
    }

    // Extract cover
    let cover: string | undefined;
    const coverData = (response as any).cover;
    if (coverData?.type === 'external') {
      cover = coverData.external.url;
    } else if (coverData?.type === 'file') {
      cover = coverData.file.url;
    }

    return {
      id: response.id,
      title,
      icon,
      cover,
      url: (response as any).url,
      created_time: (response as any).created_time,
      last_edited_time: (response as any).last_edited_time,
      properties: props,
    };
  });
}

/**
 * Fetch a page's metadata (cached)
 */
export const getPage = unstable_cache(
  fetchPage,
  ['notion-page'],
  { revalidate: 60, tags: [CACHE_TAGS.page] }
);

/**
 * Fetch all blocks from a page (internal, uncached)
 * Optimized with parallel children fetching and request deduplication
 * @param blockId - The block/page ID to fetch
 * @param depth - Current recursion depth
 * @param shallow - If true, only fetch top-level blocks (no children)
 */
async function fetchPageBlocks(blockId: string, depth: number = 0, shallow: boolean = false): Promise<NotionBlock[]> {
  const cacheKey = `blocks:${blockId}:${depth}:${shallow}`;

  return deduplicateRequest(cacheKey, async () => {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    // Fetch all blocks first (without children)
    do {
      const response = await withRetry(() => notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      }));

      for (const block of response.results) {
        blocks.push(block as unknown as NotionBlock);
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    // If shallow mode or depth limit reached, return blocks without children
    if (shallow || depth > 3) {
      return blocks;
    }

    // Fetch children in parallel with controlled concurrency
    const blocksWithChildren = blocks.filter(b => b.has_children);
    if (blocksWithChildren.length > 0) {
      const childrenResults = await Promise.all(
        blocksWithChildren.map(async (block) => {
          try {
            return { id: block.id, children: await fetchPageBlocks(block.id, depth + 1, false) };
          } catch (e) {
            console.error(`Failed to fetch children for block ${block.id}:`, e);
            return { id: block.id, children: [] };
          }
        })
      );

      // Assign children to blocks
      const childrenMap = new Map(childrenResults.map(r => [r.id, r.children]));
      for (const block of blocks) {
        if (block.has_children) {
          block.children = childrenMap.get(block.id) || [];
        }
      }
    }

    return blocks;
  });
}

/**
 * Fetch all blocks from a page (cached)
 */
export const getPageBlocks = unstable_cache(
  fetchPageBlocks,
  ['notion-blocks'],
  { revalidate: 60, tags: [CACHE_TAGS.lesson] }
);

/**
 * Get the full content of a lesson page (cached)
 */
export const getLessonContent = unstable_cache(
  async (pageId: string): Promise<{
    page: NotionPage;
    blocks: NotionBlock[];
  }> => {
    const [page, blocks] = await Promise.all([
      fetchPage(pageId),
      fetchPageBlocks(pageId),
    ]);

    return { page, blocks };
  },
  ['notion-lesson-content'],
  { revalidate: 60, tags: [CACHE_TAGS.lesson] }
);

/**
 * Check if a title indicates a module/section (contains lessons inside)
 */
function isModuleTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return (
    lowerTitle.includes('module') ||
    lowerTitle.includes('week') ||
    lowerTitle.includes('session') ||
    lowerTitle.includes('unit') ||
    lowerTitle.includes('chapter') ||
    lowerTitle.includes('part') ||
    // Match numbered sections like "1.", "1:", "1 -"
    /^\d+[\.\:\-\s]/.test(title)
  );
}

/**
 * Check if a title indicates a handbook (separate from modules)
 */
function isHandbookTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return (
    lowerTitle.includes('handbook') ||
    (lowerTitle.includes('assessment') && !lowerTitle.includes('module'))
  );
}

/**
 * Check if a title indicates a resource/support material (not primary curriculum content)
 */
function isResourceTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();

  // First check if it's explicitly module/lesson content - not a resource
  if (
    lowerTitle.includes('module') ||
    lowerTitle.includes('lesson') ||
    lowerTitle.includes('unit') ||
    lowerTitle.includes('week') ||
    /^\d+[\.\:\-\s]/.test(title) // Numbered items like "1. Intro"
  ) {
    return false;
  }

  // Check for resource-like titles
  return (
    lowerTitle.includes('resource') ||
    lowerTitle.includes('image') ||
    lowerTitle.includes('software') ||
    lowerTitle.includes('feedback') ||
    lowerTitle.includes('style guide') ||
    lowerTitle.includes('template') ||
    lowerTitle.includes('download') ||
    lowerTitle.includes('accreditation') ||
    lowerTitle.includes('administration') ||
    lowerTitle.startsWith('📂') // Folder emoji often indicates resources
  );
}

/**
 * Parse the Course Navigation page to extract modules and lessons (internal)
 * Uses shallow fetch for speed - only needs top-level blocks to identify modules
 * @param courseNavId - Optional course-specific navigation page ID
 */
async function fetchCourseNavigation(courseNavId?: string): Promise<CourseNavigation> {
  const navId = courseNavId || DEFAULT_COURSE_NAV_ID;

  console.log(`Fetching course navigation from: ${navId}`);

  // Use shallow mode - we only need top-level child_page blocks for navigation
  const blocks = await fetchPageBlocks(navId, 0, true);

  const modules: Module[] = [];
  const resources: NavigationLink[] = [];
  const handbooks: NavigationLink[] = [];

  let moduleOrder = 0;

  // Collect all link_to_page pageIds to fetch in parallel
  const linkToPageBlocks: { block: NotionBlock; index: number }[] = [];

  // First pass: categorize child_page blocks
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Look for child_page blocks which represent links to modules/pages
    if (block.type === 'child_page' && block.child_page) {
      const title = block.child_page.title;
      const id = block.id;

      console.log(`Found child_page: "${title}" (${id})`);

      // Categorize based on title
      if (isHandbookTitle(title)) {
        handbooks.push({ id, title, url: `/lessons/${id}` });
      } else if (isResourceTitle(title)) {
        resources.push({ id, title, url: `/lessons/${id}` });
      } else {
        // Treat as a module/section that contains lessons
        modules.push({
          id,
          title,
          lessons: [],
          order: moduleOrder++,
        });
      }
    }

    // Collect link_to_page blocks for parallel fetching
    if (block.type === 'link_to_page' && block.link_to_page) {
      linkToPageBlocks.push({ block, index: i });
    }
  }

  // Fetch linked pages with controlled concurrency
  if (linkToPageBlocks.length > 0) {
    console.log(`Fetching ${linkToPageBlocks.length} linked pages...`);

    const linkedPages = await Promise.all(
      linkToPageBlocks.map(async ({ block }) => {
        try {
          const pageId = block.link_to_page!.page_id;
          return await fetchPage(pageId);
        } catch (e) {
          console.error(`Failed to fetch linked page:`, e);
          return null;
        }
      })
    );

    // Process fetched pages
    linkedPages.forEach((page) => {
      if (!page) return;

      const title = page.title;
      console.log(`Found linked page: "${title}" (${page.id})`);

      if (isHandbookTitle(title)) {
        handbooks.push({ id: page.id, title, icon: page.icon, url: `/lessons/${page.id}` });
      } else if (isResourceTitle(title)) {
        resources.push({ id: page.id, title, icon: page.icon, url: `/lessons/${page.id}` });
      } else {
        modules.push({
          id: page.id,
          title,
          icon: page.icon,
          lessons: [],
          order: moduleOrder++,
        });
      }
    });
  }

  // Sort modules by order
  modules.sort((a, b) => a.order - b.order);

  console.log(`Found ${modules.length} modules, ${resources.length} resources, ${handbooks.length} handbooks`);

  return { modules, resources, handbooks };
}

/**
 * Fetch lessons from a module page (internal)
 * Uses shallow fetch since we only need lesson titles, not content
 */
async function fetchModuleLessons(moduleId: string): Promise<Lesson[]> {
  // Use shallow mode - we only need child_page blocks to list lessons
  const blocks = await fetchPageBlocks(moduleId, 0, true);
  const lessons: Lesson[] = [];
  let lessonOrder = 0;

  // Collect link_to_page blocks for parallel fetching
  const linkToPageBlocks: NotionBlock[] = [];

  for (const block of blocks) {
    if (block.type === 'child_page' && block.child_page) {
      lessons.push({
        id: block.id,
        title: block.child_page.title,
        moduleId,
        order: lessonOrder++,
      });
    }

    if (block.type === 'link_to_page' && block.link_to_page) {
      linkToPageBlocks.push(block);
    }
  }

  // Fetch linked pages with controlled concurrency
  const linkedPages = await Promise.all(
    linkToPageBlocks.map(async (block) => {
      try {
        return await fetchPage(block.link_to_page!.page_id);
      } catch (e) {
        console.error(`Failed to fetch lesson page:`, e);
        return null;
      }
    })
  );

  // Add fetched pages as lessons
  linkedPages.forEach((page, index) => {
    if (!page) return;
    lessons.push({
      id: page.id,
      title: page.title,
      moduleId,
      icon: page.icon,
      order: lessonOrder++,
    });
  });

  return lessons;
}

/**
 * Fetch lessons from a module page (cached)
 */
export const getModuleLessons = unstable_cache(
  fetchModuleLessons,
  ['notion-module-lessons'],
  { revalidate: 60, tags: [CACHE_TAGS.courseStructure] }
);

/**
 * Get full course structure with all modules and their lessons (cached)
 * Uses default course nav ID for backwards compatibility
 */
export const getFullCourseStructure = unstable_cache(
  async (): Promise<CourseNavigation> => {
    const navigation = await fetchCourseNavigation();

    // Fetch lessons for all modules in parallel with rate limiting
    const moduleLessons = await Promise.all(
      navigation.modules.map(module => fetchModuleLessons(module.id))
    );

    // Assign lessons to modules
    navigation.modules.forEach((module, index) => {
      module.lessons = moduleLessons[index];
    });

    return navigation;
  },
  ['notion-full-course'],
  { revalidate: 300, tags: [CACHE_TAGS.courseStructure] } // Increased cache to 5 minutes
);

/**
 * Get course structure for a specific course (cached)
 * @param course - The course configuration object
 */
export async function getCourseStructure(course: Course): Promise<CourseNavigation> {
  // Create a course-specific cached function
  const fetchCourseStructure = unstable_cache(
    async (): Promise<CourseNavigation> => {
      const navigation = await fetchCourseNavigation(course.notionNavId);

      // Fetch lessons for all modules in parallel with rate limiting
      const moduleLessons = await Promise.all(
        navigation.modules.map(module => fetchModuleLessons(module.id))
      );

      // Assign lessons to modules
      navigation.modules.forEach((module, index) => {
        module.lessons = moduleLessons[index];
      });

      return navigation;
    },
    [`notion-course-${course.id}`],
    { revalidate: 300, tags: [CACHE_TAGS.courseStructure, `course-${course.id}`] } // Increased cache to 5 minutes
  );

  return fetchCourseStructure();
}

/**
 * Search for pages by title
 */
export async function searchPages(query: string): Promise<NotionPage[]> {
  const response = await notion.search({
    query,
    filter: {
      property: 'object',
      value: 'page',
    },
    page_size: 20,
  });

  return response.results.map((page: any) => {
    let title = 'Untitled';
    if (page.properties?.title?.title?.[0]?.plain_text) {
      title = page.properties.title.title[0].plain_text;
    } else if (page.properties?.Name?.title?.[0]?.plain_text) {
      title = page.properties.Name.title[0].plain_text;
    }

    return {
      id: page.id,
      title,
      icon: page.icon?.emoji,
      url: page.url,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
    };
  });
}
