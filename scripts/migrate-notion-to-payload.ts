/**
 * Notion → Payload CMS Migration Script
 *
 * Migrates all course content from Notion API into Payload CMS collections.
 * Uses the existing Notion parser to transform blocks into ContentSections,
 * then maps those sections to Payload's block-based Lessons schema.
 *
 * Run with: npx tsx scripts/migrate-notion-to-payload.ts
 *
 * Options:
 *   --dry-run       Preview changes without writing to database
 *   --course=slug   Migrate only the specified course
 *   --force         Overwrite existing Payload records
 */

import { getPayload } from 'payload';
import config from '../payload.config';
import { Client } from '@notionhq/client';
import { COURSES } from '../src/lib/courses';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { ContentSection } from '../src/lib/types/content';
import type { NotionBlock, RichText, NotionPage } from '../src/lib/types';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const courseFilter = args.find(a => a.startsWith('--course='))?.split('=')[1];

// ---------------------------------------------------------------------------
// Stats tracking
// ---------------------------------------------------------------------------

const stats = {
  courses: { created: 0, skipped: 0, errors: 0 },
  modules: { created: 0, skipped: 0, errors: 0 },
  lessons: { created: 0, skipped: 0, errors: 0 },
};

// ---------------------------------------------------------------------------
// Notion client setup
// ---------------------------------------------------------------------------

function createNotionClient(apiKey?: string) {
  return new Client({
    auth: apiKey || process.env.NOTION_API_KEY,
    timeoutMs: 30000,
  });
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Notion fetching helpers (standalone, not using cached versions)
// ---------------------------------------------------------------------------

async function fetchNotionPage(client: Client, pageId: string): Promise<NotionPage> {
  const response = await client.pages.retrieve({ page_id: pageId }) as any;

  let title = 'Untitled';
  const props = response.properties;
  if (props?.title?.title?.[0]?.plain_text) {
    title = props.title.title[0].plain_text;
  } else if (props?.Name?.title?.[0]?.plain_text) {
    title = props.Name.title[0].plain_text;
  }

  let icon: string | undefined;
  if (response.icon?.type === 'emoji') {
    icon = response.icon.emoji;
  }

  let cover: string | undefined;
  if (response.cover?.type === 'external') {
    cover = response.cover.external.url;
  } else if (response.cover?.type === 'file') {
    cover = response.cover.file.url;
  }

  return {
    id: response.id,
    title,
    icon,
    cover,
    url: response.url,
    created_time: response.created_time,
    last_edited_time: response.last_edited_time,
    properties: props,
  };
}

async function fetchNotionBlocks(client: Client, blockId: string, depth = 0): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    await sleep(125); // Rate limiting
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      blocks.push(block as unknown as NotionBlock);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  // Recursively fetch children (max depth 3)
  if (depth <= 3) {
    for (const block of blocks) {
      if (block.has_children) {
        try {
          block.children = await fetchNotionBlocks(client, block.id, depth + 1);
        } catch (e) {
          console.warn(`  ⚠ Failed to fetch children for block ${block.id}`);
          block.children = [];
        }
      }
    }
  }

  return blocks;
}

async function fetchChildPages(client: Client, parentId: string): Promise<Array<{ id: string; title: string; icon?: string }>> {
  const blocks = await fetchNotionBlocks(client, parentId, 0);
  const pages: Array<{ id: string; title: string; icon?: string }> = [];

  for (const block of blocks) {
    if (block.type === 'child_page' && block.child_page) {
      pages.push({ id: block.id, title: block.child_page.title });
    } else if (block.type === 'link_to_page' && block.link_to_page) {
      try {
        const page = await fetchNotionPage(client, block.link_to_page.page_id);
        pages.push({ id: page.id, title: page.title, icon: page.icon });
      } catch (e) {
        console.warn(`  ⚠ Failed to fetch linked page ${block.link_to_page.page_id}`);
      }
    }
  }

  return pages;
}

// ---------------------------------------------------------------------------
// ContentSection → Payload block transformer
// ---------------------------------------------------------------------------

function contentSectionToPayloadBlock(section: ContentSection): Record<string, any> | null {
  switch (section.type) {
    case 'heading':
      return {
        blockType: 'heading',
        level: String(section.level),
        text: section.text,
      };

    case 'prose':
      // Prose sections contain plain text content. We store it as a simple
      // Lexical richText document with paragraph nodes.
      return {
        blockType: 'prose',
        content: createLexicalFromText(section.content),
      };

    case 'timeline':
      return {
        blockType: 'timeline',
        title: section.title || null,
        rows: section.rows.map(row => ({
          time: row.time,
          activity: row.activity,
          duration: row.duration,
          notes: row.notes || null,
        })),
      };

    case 'checklist':
      return {
        blockType: 'checklist',
        title: section.title,
        category: section.category,
        items: section.items.map(item => ({
          text: item.text,
          quantity: item.quantity || null,
        })),
      };

    case 'safety':
      return {
        blockType: 'safety',
        level: section.level,
        title: section.title || null,
        content: section.content,
        items: section.items?.map(text => ({ text })) || [],
      };

    case 'teaching-step':
      return {
        blockType: 'teachingStep',
        stepNumber: section.stepNumber,
        title: section.title || null,
        instruction: section.instruction,
        duration: section.duration || null,
        teachingApproach: section.teachingApproach || null,
        differentiation: section.differentiation || null,
        paragraphs: section.paragraphs?.map(text => ({ text })) || [],
        tips: section.tips?.map(text => ({ text })) || [],
        warnings: section.warnings?.map(text => ({ text })) || [],
        activities: section.activities?.map(a => ({
          text: a.text,
          duration: a.duration || null,
        })) || [],
        resources: section.resources?.map(r => ({
          type: r.type,
          url: r.url,
          title: r.title || null,
          caption: r.caption || null,
        })) || [],
        tables: section.tables?.map(t => ({
          headers: t.headers,
          rows: t.rows,
        })) || [],
        quotes: section.quotes?.map(text => ({ text })) || [],
      };

    case 'checkpoint':
      return {
        blockType: 'checkpoint',
        title: section.title,
        items: section.items.map(item => ({
          criterion: item.criterion,
          description: item.description || null,
        })),
      };

    case 'outcomes':
      return {
        blockType: 'outcomes',
        title: section.title,
        items: section.items.map(text => ({ text })),
      };

    case 'vocabulary':
      return {
        blockType: 'vocabulary',
        terms: section.terms.map(t => ({
          term: t.term,
          definition: t.definition,
        })),
      };

    case 'resource':
      return {
        blockType: 'resource',
        resourceType: section.resourceType,
        url: section.url,
        title: section.title || null,
        caption: section.caption || null,
      };

    default:
      console.warn(`  ⚠ Unknown section type: ${(section as any).type}`);
      return null;
  }
}

/**
 * Create a minimal Lexical document from plain text.
 * Payload's Lexical richText field expects the Lexical editor state format.
 */
function createLexicalFromText(text: string): Record<string, any> {
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  return {
    root: {
      type: 'root',
      children: paragraphs.map(paragraph => ({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: paragraph.trim(),
            format: 0,
            detail: 0,
            mode: 'normal',
            style: '',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Slugify helper
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function migrate() {
  console.log('\n🚀 Notion → Payload CMS Migration');
  console.log('='.repeat(60));
  if (DRY_RUN) console.log('🔍 DRY RUN MODE — no data will be written\n');
  if (FORCE) console.log('⚠️  FORCE MODE — existing records will be overwritten\n');

  // Initialize Payload
  console.log('📦 Initializing Payload CMS...');
  const payload = await getPayload({ config });
  console.log('   ✅ Payload ready\n');

  // Filter courses if needed
  const coursesToMigrate = courseFilter
    ? COURSES.filter(c => c.slug === courseFilter)
    : COURSES.filter(c => c.enabled);

  if (coursesToMigrate.length === 0) {
    console.log('❌ No courses to migrate. Check --course= flag or enable courses.');
    process.exit(1);
  }

  console.log(`📚 Migrating ${coursesToMigrate.length} course(s):\n`);

  for (const course of coursesToMigrate) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📗 Course: ${course.title} (${course.slug})`);
    console.log(`${'─'.repeat(60)}`);

    if (course.isHandbook) {
      await migrateHandbook(payload, course);
    } else {
      await migrateCourse(payload, course);
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Migration Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Courses:  ${stats.courses.created} created, ${stats.courses.skipped} skipped, ${stats.courses.errors} errors`);
  console.log(`   Modules:  ${stats.modules.created} created, ${stats.modules.skipped} skipped, ${stats.modules.errors} errors`);
  console.log(`   Lessons:  ${stats.lessons.created} created, ${stats.lessons.skipped} skipped, ${stats.lessons.errors} errors`);
  console.log(`\n✅ Migration complete!\n`);

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Course migration (modules + lessons structure)
// ---------------------------------------------------------------------------

async function migrateCourse(payload: any, course: typeof COURSES[0]) {
  const apiKey = course.notionApiKey || process.env.NOTION_API_KEY;
  const client = createNotionClient(apiKey);

  // Check if course already exists in Payload
  const existing = await payload.find({
    collection: 'courses',
    where: { slug: { equals: course.slug } },
    limit: 1,
  });

  if (existing.docs.length > 0 && !FORCE) {
    console.log(`   ⏭ Course "${course.title}" already exists in Payload. Use --force to overwrite.`);
    stats.courses.skipped++;
    return;
  }

  // Step 1: Fetch course structure from Notion
  console.log(`\n   📂 Fetching course structure from Notion (${course.notionNavId})...`);
  const childPages = await fetchChildPages(client, course.notionNavId);
  console.log(`   Found ${childPages.length} top-level pages`);

  // Classify top-level pages as modules
  const modulePages = childPages.filter(p => !isResourceTitle(p.title));

  // Step 2: For each module, fetch its lessons
  const moduleData: Array<{
    title: string;
    icon?: string;
    notionId: string;
    lessons: Array<{
      title: string;
      icon?: string;
      notionId: string;
      sections: ContentSection[];
    }>;
  }> = [];

  for (let mi = 0; mi < modulePages.length; mi++) {
    const modulePage = modulePages[mi];
    console.log(`\n   📁 Module ${mi + 1}/${modulePages.length}: "${modulePage.title}"`);

    // Fetch lessons under this module
    const lessonPages = await fetchChildPages(client, modulePage.id);
    console.log(`      Found ${lessonPages.length} lesson(s)`);

    const lessons: typeof moduleData[0]['lessons'] = [];

    for (let li = 0; li < lessonPages.length; li++) {
      const lessonPage = lessonPages[li];
      console.log(`      📄 Lesson ${li + 1}/${lessonPages.length}: "${lessonPage.title}"`);

      try {
        // Fetch full lesson content
        const blocks = await fetchNotionBlocks(client, lessonPage.id);

        // Parse blocks into ContentSections
        const sections = parseNotionBlocks(blocks);
        console.log(`         → ${sections.length} sections parsed (${sections.map(s => s.type).join(', ')})`);

        lessons.push({
          title: lessonPage.title,
          icon: lessonPage.icon,
          notionId: lessonPage.id,
          sections,
        });
      } catch (error) {
        console.error(`         ❌ Failed to fetch/parse lesson: ${error}`);
        stats.lessons.errors++;
      }

      // Rate limit between lessons
      await sleep(200);
    }

    moduleData.push({
      title: modulePage.title,
      icon: modulePage.icon,
      notionId: modulePage.id,
      lessons,
    });
  }

  // Step 3: Write to Payload CMS
  if (DRY_RUN) {
    console.log(`\n   🔍 [DRY RUN] Would create:`);
    console.log(`      - 1 course: "${course.title}"`);
    console.log(`      - ${moduleData.length} modules`);
    const totalLessons = moduleData.reduce((sum, m) => sum + m.lessons.length, 0);
    console.log(`      - ${totalLessons} lessons`);
    stats.courses.created++;
    stats.modules.created += moduleData.length;
    stats.lessons.created += totalLessons;
    return;
  }

  try {
    // Delete existing if force mode
    if (existing.docs.length > 0 && FORCE) {
      console.log(`\n   🗑 Deleting existing course data...`);
      // Delete lessons, modules, then course
      for (const doc of existing.docs) {
        // Find and delete related modules and lessons
        const modules = await payload.find({ collection: 'modules', limit: 100 });
        for (const mod of modules.docs) {
          const modLessons = await payload.find({
            collection: 'lessons',
            where: { module: { equals: mod.id } },
            limit: 100,
          });
          for (const lesson of modLessons.docs) {
            await payload.delete({ collection: 'lessons', id: lesson.id });
          }
          await payload.delete({ collection: 'modules', id: mod.id });
        }
        await payload.delete({ collection: 'courses', id: doc.id });
      }
    }

    // Create lessons first, then modules (with lesson refs), then course (with module refs)
    const createdModuleIds: string[] = [];

    for (let mi = 0; mi < moduleData.length; mi++) {
      const mod = moduleData[mi];
      const createdLessonIds: string[] = [];

      // Create lessons
      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];

        // Transform ContentSections to Payload blocks
        const payloadBlocks = lesson.sections
          .map(s => contentSectionToPayloadBlock(s))
          .filter(Boolean);

        const lessonSlug = slugify(lesson.title) || `lesson-${lesson.notionId.slice(0, 8)}`;

        // Create a placeholder module reference (will update after module creation)
        const createdLesson = await payload.create({
          collection: 'lessons',
          data: {
            title: lesson.title,
            slug: lessonSlug,
            module: 'placeholder', // Will be updated
            order: li,
            icon: lesson.icon || null,
            sections: payloadBlocks,
          },
        });

        createdLessonIds.push(createdLesson.id);
        stats.lessons.created++;
        console.log(`      ✅ Lesson: "${lesson.title}" (${payloadBlocks.length} blocks)`);
      }

      // Create module
      const moduleSlug = slugify(mod.title) || `module-${mod.notionId.slice(0, 8)}`;
      const createdModule = await payload.create({
        collection: 'modules',
        data: {
          title: mod.title,
          slug: moduleSlug,
          order: mi,
          icon: mod.icon || null,
          lessons: createdLessonIds,
        },
      });

      // Update lessons with correct module reference
      for (const lessonId of createdLessonIds) {
        await payload.update({
          collection: 'lessons',
          id: lessonId,
          data: { module: createdModule.id },
        });
      }

      createdModuleIds.push(createdModule.id);
      stats.modules.created++;
      console.log(`   ✅ Module: "${mod.title}" (${createdLessonIds.length} lessons)`);
    }

    // Create course
    await payload.create({
      collection: 'courses',
      data: {
        title: course.title,
        slug: course.slug,
        shortTitle: course.shortTitle || null,
        description: course.description || null,
        color: course.color || 'green',
        icon: course.icon || null,
        order: 0,
        duration: course.duration || null,
        level: course.level || null,
        accreditation: course.accreditation || null,
        enabled: course.enabled,
        isHandbook: false,
        modules: createdModuleIds,
      },
    });

    stats.courses.created++;
    console.log(`\n   ✅ Course "${course.title}" created successfully!`);

  } catch (error) {
    console.error(`\n   ❌ Failed to create course "${course.title}":`, error);
    stats.courses.errors++;
  }
}

// ---------------------------------------------------------------------------
// Handbook migration (flat section list, no modules)
// ---------------------------------------------------------------------------

async function migrateHandbook(payload: any, course: typeof COURSES[0]) {
  const apiKey = course.notionApiKey || process.env.NOTION_API_KEY;

  // Check if handbook sections already exist
  const existing = await payload.find({
    collection: 'handbooks',
    limit: 1,
  });

  if (existing.docs.length > 0 && !FORCE) {
    console.log(`   ⏭ Handbook sections already exist in Payload. Use --force to overwrite.`);
    stats.courses.skipped++;
    return;
  }

  console.log(`\n   📖 Fetching handbook data from Notion...`);

  try {
    // Fetch handbook database entries
    const response = await fetch(
      `https://api.notion.com/v1/databases/${course.notionNavId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   Found ${data.results.length} handbook pages`);

    if (DRY_RUN) {
      console.log(`\n   🔍 [DRY RUN] Would create ${data.results.length} handbook sections`);
      stats.courses.created++;
      return;
    }

    // Delete existing if force mode
    if (FORCE) {
      const allHandbooks = await payload.find({ collection: 'handbooks', limit: 200 });
      for (const doc of allHandbooks.docs) {
        await payload.delete({ collection: 'handbooks', id: doc.id });
      }
    }

    let order = 0;
    for (const page of data.results) {
      if (!('properties' in page)) continue;
      const props = page.properties;

      // Extract title
      let name = 'Untitled';
      if (props.Name?.type === 'title' && props.Name.title?.[0]) {
        name = props.Name.title[0].plain_text;
      }

      // Extract other properties
      const chapter = extractProp(props, 'Chapter', 'rich_text');
      const section = extractProp(props, 'Section', 'rich_text');
      const icon = extractProp(props, 'Icon', 'rich_text');
      const pageRange = extractProp(props, 'Page Range', 'rich_text') || extractProp(props, 'Pages', 'rich_text');
      const estTime = extractProp(props, 'Est. Time', 'rich_text');
      const hasVideo = props['Has Video']?.checkbox || false;
      const orderProp = props.Order?.number;

      const slug = slugify(name) || `handbook-${page.id.slice(0, 8)}`;

      await payload.create({
        collection: 'handbooks',
        data: {
          title: name,
          slug,
          chapter: chapter || null,
          section: section || null,
          icon: icon || null,
          pageRange: pageRange || null,
          estTime: estTime || null,
          hasVideo,
          order: orderProp ?? order,
        },
      });

      order++;
      console.log(`      ✅ Handbook section: "${name}"`);
    }

    stats.courses.created++;
    console.log(`\n   ✅ Handbook "${course.title}" migrated (${order} sections)`);

  } catch (error) {
    console.error(`\n   ❌ Failed to migrate handbook:`, error);
    stats.courses.errors++;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractProp(props: any, name: string, type: string): string {
  if (!(name in props)) return '';
  const prop = props[name];
  if (type === 'rich_text' && prop.type === 'rich_text') {
    return prop.rich_text?.[0]?.plain_text || '';
  }
  if (type === 'select' && prop.type === 'select') {
    return prop.select?.name || '';
  }
  return '';
}

function isResourceTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('resource') ||
    lower.includes('image') ||
    lower.includes('software') ||
    lower.includes('feedback') ||
    lower.includes('style guide') ||
    lower.includes('template') ||
    lower.includes('download') ||
    lower.includes('accreditation') ||
    lower.includes('administration') ||
    lower.startsWith('📂')
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

migrate().catch((error) => {
  console.error('\n💥 Migration failed:', error);
  process.exit(1);
});
