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

async function testSectionParsing() {
  const lessonId = process.argv[2];

  if (!lessonId) {
    console.error('Usage: npx tsx scripts/test-section-parsing.ts <lessonId>');
    process.exit(1);
  }

  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY environment variable is required');
    console.error('Run: source .env.local && npx tsx scripts/test-section-parsing.ts <lessonId>');
    process.exit(1);
  }

  console.log(`\n=== Testing SECTION Pattern Parsing ===\n`);
  console.log(`Lesson ID: ${lessonId}\n`);

  try {
    const blocks = await fetchPageBlocks(lessonId);
    console.log(`Total raw blocks: ${blocks.length}\n`);

    // Parse blocks
    const sections = parseNotionBlocks(blocks);

    // Count by type
    const typeCounts: Record<string, number> = {};
    sections.forEach(s => {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    });

    console.log('=== Section Type Summary ===');
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      const marker = type === 'teaching-step' ? ' <-- TARGET' : '';
      console.log(`  ${type}: ${count}${marker}`);
    });

    // Show teaching-step sections in detail
    const teachingSteps = sections.filter(s => s.type === 'teaching-step');

    if (teachingSteps.length === 0) {
      console.log('\n⚠️  No teaching-step sections detected!');
      console.log('\nLooking for SECTION patterns in raw blocks...');

      // Debug: find heading blocks that might be SECTION patterns
      blocks.forEach((block, i) => {
        if (block.type.startsWith('heading_')) {
          const headingType = block.type as 'heading_1' | 'heading_2' | 'heading_3';
          const content = block[headingType] as { rich_text: Array<{ plain_text: string }> } | undefined;
          const text = content?.rich_text?.map(rt => rt.plain_text).join('') || '';
          if (text.toLowerCase().includes('section')) {
            console.log(`  [${i}] ${block.type}: "${text}"`);
          }
        }
      });
    } else {
      console.log(`\n=== Teaching Step Sections (${teachingSteps.length}) ===\n`);

      teachingSteps.forEach((section, i) => {
        if (section.type !== 'teaching-step') return;

        console.log(`\n--- Section ${section.stepNumber}: ${section.title || '(no title)'} ---`);
        console.log(`  Duration: ${section.duration || '(none)'}`);
        console.log(`  Instruction: ${section.instruction?.substring(0, 60) || '(none)'}...`);

        if (section.activities && section.activities.length > 0) {
          console.log(`  Activities (${section.activities.length}):`);
          section.activities.forEach((act, j) => {
            console.log(`    ${j + 1}. ${act.text}${act.duration ? ` (${act.duration})` : ''}`);
          });
        }

        if (section.teachingApproach) {
          console.log(`  Teaching Approach: ${section.teachingApproach.substring(0, 80)}...`);
        }

        if (section.differentiation) {
          console.log(`  Differentiation: ${section.differentiation.substring(0, 80)}...`);
        }

        if (section.tips && section.tips.length > 0) {
          console.log(`  Tips: ${section.tips.length} items`);
        }

        if (section.resources && section.resources.length > 0) {
          console.log(`  Resources (${section.resources.length}):`);
          section.resources.forEach((res, j) => {
            console.log(`    ${j + 1}. [${res.type}] ${res.title || res.url.substring(0, 50)}...`);
          });
        }

        if (section.tables && section.tables.length > 0) {
          console.log(`  Tables: ${section.tables.length} table(s)`);
        }

        if (section.quotes && section.quotes.length > 0) {
          console.log(`  Quotes: ${section.quotes.length} quote(s)`);
        }
      });
    }

    console.log('\n=== Test Complete ===\n');

    // Exit with error if no teaching steps found
    if (teachingSteps.length === 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSectionParsing();
