import { Client } from '@notionhq/client';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { NotionBlock } from '../src/lib/types';

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

function countBlockTypes(blocks: NotionBlock[], counts: Record<string, number> = {}): Record<string, number> {
  for (const block of blocks) {
    counts[block.type] = (counts[block.type] || 0) + 1;
    if (block.children && block.children.length > 0) {
      countBlockTypes(block.children, counts);
    }
  }
  return counts;
}

async function compareContent() {
  const lessonIds = [
    { name: 'Lesson 1: Workshop Safety', id: '1a44c615-3ed9-80d7-a6af-caddc7006631' },
    { name: 'Lesson 2: Structural Properties', id: '1a44c615-3ed9-8038-82db-e1650859d0ff' },
    { name: 'Lesson 6: Bicycle Introduction', id: '1a54c615-3ed9-8029-8de7-fe022d5153ea' },
    { name: 'Lesson 9: Bicycle Geometry', id: '1a54c615-3ed9-8062-9e4c-dd106634e80f' },
  ];

  // If a specific lesson ID is provided, only test that one
  const targetId = process.argv[2];
  const lessonsToTest = targetId
    ? [{ name: 'Custom Lesson', id: targetId }]
    : lessonIds;

  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY environment variable is required');
    console.error('Run: export $(grep -v "^#" .env.local | xargs) && npx tsx scripts/compare-content.ts');
    process.exit(1);
  }

  console.log('\n=== CONTENT COVERAGE ANALYSIS ===\n');

  for (const lesson of lessonsToTest) {
    console.log(`\n--- ${lesson.name} ---`);
    console.log(`ID: ${lesson.id}\n`);

    try {
      const blocks = await fetchPageBlocks(lesson.id);
      const sections = parseNotionBlocks(blocks);

      // Count raw block types (including nested)
      const blockCounts = countBlockTypes(blocks);
      const totalBlocks = Object.values(blockCounts).reduce((a, b) => a + b, 0);

      // Count section types
      const sectionCounts: Record<string, number> = {};
      for (const section of sections) {
        sectionCounts[section.type] = (sectionCounts[section.type] || 0) + 1;
      }

      console.log('RAW NOTION BLOCKS:');
      Object.entries(blockCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });

      console.log(`\nPARSED SECTIONS:`);
      Object.entries(sectionCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });

      // Coverage analysis
      const contentBlocks = totalBlocks - (blockCounts['divider'] || 0) - (blockCounts['table_row'] || 0);
      const coverage = ((sections.length / contentBlocks) * 100).toFixed(1);

      console.log(`\nCOVERAGE: ${sections.length} sections from ${contentBlocks} content blocks (${coverage}% efficiency)`);

      // Count embedded resources in teaching steps
      let embeddedVideos = 0;
      let embeddedFiles = 0;
      let embeddedImages = 0;
      for (const section of sections) {
        if ('resources' in section && section.resources) {
          for (const res of section.resources as Array<{ type: string }>) {
            if (res.type === 'video') embeddedVideos++;
            else if (res.type === 'file') embeddedFiles++;
            else if (res.type === 'image') embeddedImages++;
          }
        }
      }

      // Check for potential gaps (accounting for both top-level and embedded resources)
      const gaps: string[] = [];
      const hasResourceSections = (sectionCounts['resource'] || 0) > 0;
      if (blockCounts['toggle'] && !sectionCounts['heading']) {
        gaps.push(`⚠️ ${blockCounts['toggle']} toggle blocks may need heading extraction`);
      }
      if (blockCounts['video'] && !hasResourceSections && embeddedVideos === 0) {
        gaps.push(`⚠️ ${blockCounts['video']} video blocks not appearing as resources`);
      }
      if (blockCounts['file'] && !hasResourceSections && embeddedFiles === 0) {
        gaps.push(`⚠️ ${blockCounts['file']} file blocks not appearing as resources`);
      }
      if (blockCounts['image'] && !hasResourceSections && embeddedImages === 0) {
        gaps.push(`⚠️ ${blockCounts['image']} image blocks not appearing as resources`);
      }

      if (gaps.length > 0) {
        console.log('\nPOTENTIAL GAPS:');
        gaps.forEach(gap => console.log(`  ${gap}`));
      } else {
        console.log('\n✓ No obvious content gaps detected');
      }

      // Show teaching-step content richness
      const teachingSteps = sections.filter(s => s.type === 'teaching-step');
      if (teachingSteps.length > 0) {
        let hasResources = 0;
        let hasParagraphs = 0;
        let hasTables = 0;
        let hasQuotes = 0;

        for (const step of teachingSteps) {
          if ('resources' in step && step.resources?.length) hasResources++;
          if ('paragraphs' in step && step.paragraphs?.length) hasParagraphs++;
          if ('tables' in step && step.tables?.length) hasTables++;
          if ('quotes' in step && step.quotes?.length) hasQuotes++;
        }

        console.log(`\nTEACHING STEP RICHNESS (${teachingSteps.length} steps):`);
        console.log(`  With resources: ${hasResources}`);
        console.log(`  With multiple paragraphs: ${hasParagraphs}`);
        console.log(`  With tables: ${hasTables}`);
        console.log(`  With quotes: ${hasQuotes}`);
      }

    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }

  console.log('\n=== ANALYSIS COMPLETE ===\n');
}

compareContent();
