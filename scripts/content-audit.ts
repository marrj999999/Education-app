import { Client } from '@notionhq/client';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { NotionBlock } from '../src/lib/types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Lesson 2 has the most diverse content
const LESSON_ID = process.argv[2] || '1a44c615-3ed9-8038-82db-e1650859d0ff';

interface ContentAudit {
  notion: {
    tables: number;
    callouts: number;
    headings: number;
    bulletLists: number;
    todoItems: number;
    numberedLists: number;
    videos: number;
    files: number;
    images: number;
    quotes: number;
    toggles: number;
    paragraphs: number;
    other: string[];
  };
  parsed: {
    byType: Record<string, number>;
    totalSections: number;
  };
  gaps: string[];
}

async function fetchAllBlocks(blockId: string, depth = 0): Promise<NotionBlock[]> {
  const allBlocks: NotionBlock[] = [];
  let cursor: string | undefined;

  // Handle pagination
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100
    });

    for (const block of response.results) {
      if ('type' in block) {
        const notionBlock = block as unknown as NotionBlock;
        allBlocks.push(notionBlock);

        // Fetch children recursively
        if (notionBlock.has_children) {
          const children = await fetchAllBlocks(notionBlock.id, depth + 1);
          notionBlock.children = children;
          allBlocks.push(...children);
        }
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return allBlocks;
}

async function fetchTopLevelBlocksWithChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  // Handle pagination
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100
    });

    for (const block of response.results) {
      if ('type' in block) {
        const notionBlock = block as unknown as NotionBlock;

        // Fetch children if present
        if (notionBlock.has_children) {
          notionBlock.children = await fetchAllBlocks(notionBlock.id);
        }

        blocks.push(notionBlock);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function audit(): Promise<void> {
  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY environment variable is required');
    console.error('Run: export $(grep -v "^#" .env.local | xargs) && npx tsx scripts/content-audit.ts');
    process.exit(1);
  }

  console.log('Fetching all blocks from Notion (including children)...\n');
  console.log(`Lesson ID: ${LESSON_ID}\n`);

  const allBlocks = await fetchAllBlocks(LESSON_ID);

  // Count raw Notion block types
  const notionCounts = {
    tables: 0,
    callouts: 0,
    headings: 0,
    bulletLists: 0,
    todoItems: 0,
    numberedLists: 0,
    videos: 0,
    files: 0,
    images: 0,
    quotes: 0,
    toggles: 0,
    paragraphs: 0,
    dividers: 0,
    tableRows: 0,
    other: [] as string[],
  };

  const tableHeaders: string[][] = [];
  const calloutColors: string[] = [];
  const videoUrls: string[] = [];
  const fileNames: string[] = [];

  for (const block of allBlocks) {
    const type = block.type;

    switch (type) {
      case 'table':
        notionCounts.tables++;
        break;
      case 'table_row':
        notionCounts.tableRows++;
        // Extract headers from first row
        const cells = block.table_row?.cells || [];
        if (cells.length > 0) {
          const headers = cells.map((c) =>
            c.map((t) => t.plain_text || '').join('')
          );
          if (headers.some((h: string) => h.toLowerCase().includes('item') || h.toLowerCase().includes('time') || h.toLowerCase().includes('session'))) {
            tableHeaders.push(headers);
          }
        }
        break;
      case 'callout':
        notionCounts.callouts++;
        calloutColors.push(block.callout?.color || 'unknown');
        break;
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        notionCounts.headings++;
        break;
      case 'bulleted_list_item':
        notionCounts.bulletLists++;
        break;
      case 'to_do':
        notionCounts.todoItems++;
        break;
      case 'numbered_list_item':
        notionCounts.numberedLists++;
        break;
      case 'video':
        notionCounts.videos++;
        const videoUrl = block.video?.external?.url ||
                        block.video?.file?.url || '';
        videoUrls.push(videoUrl.substring(0, 60) + '...');
        break;
      case 'file':
        notionCounts.files++;
        fileNames.push(block.file?.name || 'unnamed');
        break;
      case 'image':
        notionCounts.images++;
        break;
      case 'quote':
        notionCounts.quotes++;
        break;
      case 'toggle':
        notionCounts.toggles++;
        break;
      case 'paragraph':
        notionCounts.paragraphs++;
        break;
      case 'divider':
        notionCounts.dividers++;
        break;
      default:
        if (!notionCounts.other.includes(type)) {
          notionCounts.other.push(type);
        }
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('NOTION RAW CONTENT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total blocks (including children): ${allBlocks.length}`);
  console.log('');
  console.log('Block counts:');
  console.log(`  📊 Tables: ${notionCounts.tables} (${notionCounts.tableRows} rows)`);
  console.log(`  📢 Callouts: ${notionCounts.callouts} (colors: ${[...new Set(calloutColors)].join(', ')})`);
  console.log(`  📌 Headings: ${notionCounts.headings}`);
  console.log(`  • Bullet lists: ${notionCounts.bulletLists}`);
  console.log(`  ☑️  To-do items: ${notionCounts.todoItems}`);
  console.log(`  1. Numbered lists: ${notionCounts.numberedLists}`);
  console.log(`  🎬 Videos: ${notionCounts.videos}`);
  console.log(`  📁 Files: ${notionCounts.files}`);
  console.log(`  🖼️  Images: ${notionCounts.images}`);
  console.log(`  💬 Quotes: ${notionCounts.quotes}`);
  console.log(`  ▶ Toggles: ${notionCounts.toggles}`);
  console.log(`  ¶ Paragraphs: ${notionCounts.paragraphs}`);
  console.log(`  — Dividers: ${notionCounts.dividers}`);
  if (notionCounts.other.length > 0) {
    console.log(`  Other types: ${notionCounts.other.join(', ')}`);
  }

  if (tableHeaders.length > 0) {
    console.log('\nTable headers found:');
    tableHeaders.slice(0, 5).forEach((h, i) => {
      console.log(`  ${i + 1}. [${h.join(' | ')}]`);
    });
  }

  if (videoUrls.length > 0) {
    console.log('\nVideo URLs:');
    videoUrls.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v}`);
    });
  }

  if (fileNames.length > 0) {
    console.log('\nFile names:');
    fileNames.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });
  }

  // Now parse and compare
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('PARSED SECTIONS');
  console.log('═══════════════════════════════════════════════════════════');

  // Get top-level blocks with children for parsing
  const topLevelBlocks = await fetchTopLevelBlocksWithChildren(LESSON_ID);
  const sections = parseNotionBlocks(topLevelBlocks);

  const parsedCounts: Record<string, number> = {};
  sections.forEach((s) => {
    parsedCounts[s.type] = (parsedCounts[s.type] || 0) + 1;
  });

  console.log(`Total sections: ${sections.length}`);
  console.log('\nSection types:');
  Object.entries(parsedCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  // Count embedded resources in teaching steps AND top-level resource sections
  let embeddedVideos = 0;
  let embeddedFiles = 0;
  let embeddedImages = 0;
  let embeddedTables = 0;
  let embeddedQuotes = 0;
  let topLevelVideos = 0;
  let topLevelFiles = 0;
  let topLevelImages = 0;

  for (const section of sections) {
    // Count top-level resource sections
    if (section.type === 'resource') {
      const resourceType = (section as { resourceType?: string }).resourceType;
      if (resourceType === 'video') topLevelVideos++;
      else if (resourceType === 'file' || resourceType === 'pdf') topLevelFiles++;
      else if (resourceType === 'image') topLevelImages++;
    }

    // Count embedded resources in teaching steps
    if ('resources' in section && section.resources) {
      for (const res of section.resources as Array<{ type: string }>) {
        if (res.type === 'video') embeddedVideos++;
        else if (res.type === 'file') embeddedFiles++;
        else if (res.type === 'image') embeddedImages++;
      }
    }
    if ('tables' in section && section.tables) {
      embeddedTables += (section.tables as unknown[]).length;
    }
    if ('quotes' in section && section.quotes) {
      embeddedQuotes += (section.quotes as unknown[]).length;
    }
  }

  const totalParsedVideos = topLevelVideos + embeddedVideos;
  const totalParsedFiles = topLevelFiles + embeddedFiles;
  const totalParsedImages = topLevelImages + embeddedImages;

  console.log('\nTop-level resource sections:');
  console.log(`  Videos: ${topLevelVideos}`);
  console.log(`  Files/PDFs: ${topLevelFiles}`);
  console.log(`  Images: ${topLevelImages}`);

  console.log('\nEmbedded in teaching steps:');
  console.log(`  Videos: ${embeddedVideos}`);
  console.log(`  Files: ${embeddedFiles}`);
  console.log(`  Images: ${embeddedImages}`);
  console.log(`  Tables: ${embeddedTables}`);
  console.log(`  Quotes: ${embeddedQuotes}`);

  console.log('\nTotal parsed:');
  console.log(`  Videos: ${totalParsedVideos}`);
  console.log(`  Files: ${totalParsedFiles}`);
  console.log(`  Images: ${totalParsedImages}`);

  // Identify gaps
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('GAP ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════');

  const gaps: string[] = [];
  const successes: string[] = [];

  // Check videos
  if (notionCounts.videos > 0) {
    if (totalParsedVideos >= notionCounts.videos) {
      successes.push(`✅ All ${notionCounts.videos} videos captured (${topLevelVideos} top-level, ${embeddedVideos} embedded)`);
    } else {
      gaps.push(`❌ ${notionCounts.videos} videos in Notion but only ${totalParsedVideos} parsed`);
    }
  }

  // Check files
  if (notionCounts.files > 0) {
    if (totalParsedFiles >= notionCounts.files) {
      successes.push(`✅ All ${notionCounts.files} files captured (${topLevelFiles} top-level, ${embeddedFiles} embedded)`);
    } else {
      gaps.push(`❌ ${notionCounts.files} files in Notion but only ${totalParsedFiles} parsed`);
    }
  }

  // Check images
  if (notionCounts.images > 0) {
    if (totalParsedImages >= notionCounts.images) {
      successes.push(`✅ All ${notionCounts.images} images captured (${topLevelImages} top-level, ${embeddedImages} embedded)`);
    } else {
      gaps.push(`❌ ${notionCounts.images} images in Notion but only ${totalParsedImages} parsed`);
    }
  }

  // Check quotes
  if (notionCounts.quotes > 0) {
    if (embeddedQuotes >= notionCounts.quotes) {
      successes.push(`✅ All ${notionCounts.quotes} quotes captured`);
    } else {
      gaps.push(`❌ ${notionCounts.quotes} quotes in Notion but only ${embeddedQuotes} parsed`);
    }
  }

  // Check toggles
  if (notionCounts.toggles > 0) {
    if (parsedCounts['heading']) {
      successes.push(`✅ ${notionCounts.toggles} toggles expanded into content`);
    } else {
      gaps.push(`❌ ${notionCounts.toggles} toggles not being captured`);
    }
  }

  // Check to-do items
  if (notionCounts.todoItems > 0) {
    if (parsedCounts['checklist']) {
      successes.push(`✅ To-do items captured in ${parsedCounts['checklist']} checklist section(s)`);
    } else {
      gaps.push(`❌ ${notionCounts.todoItems} to-do items not appearing in checklists`);
    }
  }

  // Check safety callouts
  const redCallouts = calloutColors.filter(c => c.includes('red') || c.includes('yellow') || c.includes('orange')).length;
  if (redCallouts > 0) {
    if (parsedCounts['safety']) {
      successes.push(`✅ Safety callouts captured (${parsedCounts['safety']} sections)`);
    } else {
      gaps.push(`❌ ${redCallouts} safety-colored callouts not captured`);
    }
  }

  // Check teaching steps
  if (parsedCounts['teaching-step']) {
    successes.push(`✅ ${parsedCounts['teaching-step']} teaching-step sections`);
  }

  // Print results
  if (successes.length > 0) {
    console.log('\n🟢 CAPTURED CONTENT:');
    successes.forEach(s => console.log(`  ${s}`));
  }

  if (gaps.length > 0) {
    console.log('\n🔴 CONTENT GAPS:');
    gaps.forEach(g => console.log(`  ${g}`));
  } else {
    console.log('\n🎉 No content gaps detected!');
  }

  // Detailed section preview
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SECTION PREVIEW (first 10)');
  console.log('═══════════════════════════════════════════════════════════');

  sections.slice(0, 10).forEach((section, i) => {
    console.log(`\n${i + 1}. [${section.type}]`);
    if ('title' in section && section.title) console.log(`   Title: ${section.title}`);
    if ('text' in section && section.text) console.log(`   Text: ${(section.text as string).substring(0, 80)}...`);
    if ('content' in section && section.content) console.log(`   Content: ${(section.content as string).substring(0, 80)}...`);
    if ('instruction' in section && section.instruction) console.log(`   Instruction: ${(section.instruction as string).substring(0, 80)}...`);
    if ('items' in section && section.items) console.log(`   Items: ${(section.items as unknown[]).length}`);
    if ('rows' in section && section.rows) console.log(`   Rows: ${(section.rows as unknown[]).length}`);
    if ('activities' in section && section.activities) console.log(`   Activities: ${(section.activities as unknown[]).length}`);
    if ('resources' in section && section.resources) console.log(`   Resources: ${(section.resources as unknown[]).length}`);
    if ('tables' in section && section.tables) console.log(`   Tables: ${(section.tables as unknown[]).length}`);
    if ('quotes' in section && section.quotes) console.log(`   Quotes: ${(section.quotes as unknown[]).length}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('AUDIT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

audit().catch(console.error);
