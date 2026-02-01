import { Client } from '@notionhq/client';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { NotionBlock } from '../src/lib/types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const LESSON_ID = process.argv[2] || '1a44c615-3ed9-8038-82db-e1650859d0ff'; // Lesson 2

async function fetchWithChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100
    });

    for (const block of response.results) {
      if ('type' in block) {
        const notionBlock = block as unknown as NotionBlock;
        if (notionBlock.has_children) {
          notionBlock.children = await fetchWithChildren(notionBlock.id);
        }
        blocks.push(notionBlock);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function auditRendering() {
  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY environment variable is required');
    console.error('Run: export $(grep -v "^#" .env.local | xargs) && npx tsx scripts/audit-rendering.ts');
    process.exit(1);
  }

  console.log('Fetching blocks and parsing...\n');
  console.log(`Lesson ID: ${LESSON_ID}\n`);

  const blocks = await fetchWithChildren(LESSON_ID);
  const sections = parseNotionBlocks(blocks);

  console.log('RENDERING AUDIT - What each section contains:\n');

  sections.forEach((section, i) => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`SECTION ${i + 1}: ${section.type.toUpperCase()}`);
    console.log('─'.repeat(60));

    // Log ALL properties of this section
    Object.entries(section).forEach(([key, value]) => {
      if (key === 'id') return;

      if (Array.isArray(value)) {
        console.log(`  ${key}: [${value.length} items]`);
        if (value.length > 0 && value.length <= 3) {
          value.forEach((item, j) => {
            if (typeof item === 'object') {
              console.log(`    ${j + 1}. ${JSON.stringify(item).substring(0, 100)}`);
            } else {
              console.log(`    ${j + 1}. ${String(item).substring(0, 100)}`);
            }
          });
        } else if (value.length > 3) {
          console.log(`    First: ${JSON.stringify(value[0]).substring(0, 80)}...`);
          console.log(`    Last: ${JSON.stringify(value[value.length - 1]).substring(0, 80)}...`);
        }
      } else if (typeof value === 'string' && value.length > 100) {
        console.log(`  ${key}: "${value.substring(0, 100)}..."`);
      } else {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
    });

    // Check for potentially unrendered content
    const warnings: string[] = [];

    if ('resources' in section && (section as { resources?: unknown[] }).resources?.length) {
      const resources = (section as { resources: Array<{ type: string }> }).resources;
      warnings.push(`HAS ${resources.length} RESOURCES - verify they render:`);
      resources.forEach((r, idx) => {
        warnings.push(`  ${idx + 1}. [${r.type}]`);
      });
    }
    if ('tables' in section && (section as { tables?: unknown[] }).tables?.length) {
      warnings.push(`HAS ${(section as { tables: unknown[] }).tables.length} TABLES - verify they render`);
    }
    if ('quotes' in section && (section as { quotes?: unknown[] }).quotes?.length) {
      warnings.push(`HAS ${(section as { quotes: unknown[] }).quotes.length} QUOTES - verify they render`);
    }
    if ('paragraphs' in section && (section as { paragraphs?: unknown[] }).paragraphs && (section as { paragraphs: unknown[] }).paragraphs.length > 1) {
      warnings.push(`HAS ${(section as { paragraphs: unknown[] }).paragraphs.length} PARAGRAPHS - verify all render`);
    }
    if ('activities' in section && (section as { activities?: unknown[] }).activities?.length) {
      const activities = (section as { activities: Array<{ duration?: string }> }).activities;
      const withDuration = activities.filter(a => a.duration);
      warnings.push(`HAS ${activities.length} ACTIVITIES (${withDuration.length} with duration)`);
    }
    if ('teachingApproach' in section && (section as { teachingApproach?: string }).teachingApproach) {
      warnings.push(`HAS teachingApproach text`);
    }
    if ('differentiation' in section && (section as { differentiation?: string }).differentiation) {
      warnings.push(`HAS differentiation text`);
    }
    if ('items' in section && (section as { items?: unknown[] }).items && (section as { items: unknown[] }).items.length > 10) {
      warnings.push(`HAS ${(section as { items: unknown[] }).items.length} items - may need pagination/grouping`);
    }

    if (warnings.length > 0) {
      console.log('\n  RENDER CHECK:');
      warnings.forEach(w => console.log(`    ${w}`));
    }
  });

  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('COMPONENT REQUIREMENTS SUMMARY');
  console.log('═'.repeat(60));

  const requirements: Record<string, string[]> = {};

  sections.forEach((section) => {
    if (!requirements[section.type]) {
      requirements[section.type] = [];
    }

    Object.keys(section).forEach(key => {
      if (key !== 'id' && key !== 'type' && !requirements[section.type].includes(key)) {
        requirements[section.type].push(key);
      }
    });
  });

  Object.entries(requirements).forEach(([type, fields]) => {
    console.log(`\n${type}:`);
    console.log(`  Required fields: ${fields.join(', ')}`);
  });

  // Teaching step specifics
  const teachingSteps = sections.filter(s => s.type === 'teaching-step');
  if (teachingSteps.length > 0) {
    console.log('\n\n' + '═'.repeat(60));
    console.log('TEACHING STEP DETAILS');
    console.log('═'.repeat(60));

    teachingSteps.forEach((step, i) => {
      const s = step as unknown as Record<string, unknown>;
      console.log(`\n${i + 1}. ${s.title || `Section ${s.stepNumber}`}`);
      console.log(`   stepNumber: ${s.stepNumber}`);
      console.log(`   duration: ${s.duration || '(none)'}`);
      console.log(`   instruction: ${s.instruction ? String(s.instruction).substring(0, 50) + '...' : '(none)'}`);
      console.log(`   activities: ${(s.activities as unknown[] | undefined)?.length || 0}`);
      console.log(`   paragraphs: ${(s.paragraphs as unknown[] | undefined)?.length || 0}`);
      console.log(`   resources: ${(s.resources as unknown[] | undefined)?.length || 0}`);
      console.log(`   tables: ${(s.tables as unknown[] | undefined)?.length || 0}`);
      console.log(`   quotes: ${(s.quotes as unknown[] | undefined)?.length || 0}`);
      console.log(`   tips: ${(s.tips as unknown[] | undefined)?.length || 0}`);
      console.log(`   teachingApproach: ${s.teachingApproach ? 'YES' : 'no'}`);
      console.log(`   differentiation: ${s.differentiation ? 'YES' : 'no'}`);
    });
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('AUDIT COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

auditRendering().catch(console.error);
