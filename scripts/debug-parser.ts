import { Client } from '@notionhq/client';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { NotionBlock } from '../src/lib/types';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function fetchPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ('type' in block) {
        const notionBlock = block as unknown as NotionBlock;

        // Fetch children for blocks that can have them
        if (notionBlock.has_children) {
          notionBlock.children = await fetchPageBlocks(notionBlock.id);
        }

        blocks.push(notionBlock);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function fetchPage(pageId: string) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return page;
}

async function debugParser() {
  const lessonId = process.argv[2];

  if (!lessonId) {
    console.error('Usage: npx tsx scripts/debug-parser.ts <lessonId>');
    process.exit(1);
  }

  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY environment variable is required');
    console.error('Run: source .env.local && npx tsx scripts/debug-parser.ts <lessonId>');
    process.exit(1);
  }

  console.log(`\n=== Debugging parser for lesson: ${lessonId} ===\n`);

  try {
    // Fetch the lesson content directly from Notion
    const [page, blocks] = await Promise.all([
      fetchPage(lessonId),
      fetchPageBlocks(lessonId),
    ]);

    const title = (page as any).properties?.title?.title?.[0]?.plain_text ||
                  (page as any).properties?.Name?.title?.[0]?.plain_text ||
                  'Untitled';

    console.log(`Lesson: ${title}`);
    console.log(`Total blocks: ${blocks.length}\n`);

    // Show raw block types
    console.log('=== Raw Notion Block Types ===');
    blocks.forEach((block, i) => {
      const text = getBlockText(block);
      const hasChildren = block.has_children ? ' [has children]' : '';
      console.log(`${i}: ${block.type}${hasChildren} - "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
    });

    console.log('\n=== Parsed Sections ===');
    const sections = parseNotionBlocks(blocks);

    sections.forEach((section, i) => {
      console.log(`\n[${i}] Type: ${section.type}`);
      console.log(`    ID: ${section.id}`);

      // Show section-specific data
      if ('title' in section) {
        console.log(`    Title: ${(section as any).title}`);
      }
      if ('items' in section) {
        console.log(`    Items: ${(section as any).items?.length || 0}`);
      }
      if ('content' in section) {
        const content = (section as any).content;
        if (typeof content === 'string') {
          console.log(`    Content: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`);
        } else if (Array.isArray(content)) {
          console.log(`    Content: [${content.length} items]`);
        } else {
          console.log(`    Content: ${JSON.stringify(content).substring(0, 60)}...`);
        }
      }
      if ('level' in section) {
        console.log(`    Level: ${(section as any).level}`);
      }
      if ('severity' in section) {
        console.log(`    Severity: ${(section as any).severity}`);
      }
    });

    console.log(`\n=== Summary ===`);
    console.log(`Total raw blocks: ${blocks.length}`);
    console.log(`Total parsed sections: ${sections.length}`);

    // Count by type
    const typeCounts: Record<string, number> = {};
    sections.forEach(s => {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    });
    console.log('\nSection types:');
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

function getBlockText(block: NotionBlock): string {
  const blockType = block.type as keyof NotionBlock;
  const content = block[blockType];
  if (content && typeof content === 'object' && 'rich_text' in content) {
    return (content as any).rich_text?.map((t: any) => t.plain_text).join('') || '';
  }
  if (block.type === 'callout' && block.callout) {
    return block.callout.rich_text?.map((t: any) => t.plain_text).join('') || '';
  }
  return '';
}

debugParser();
