/**
 * Integration Test Script for Notion Parser
 *
 * Fetches real blocks from a Notion lesson page and runs them through the parser.
 *
 * Usage: npx ts-node scripts/test-parser.ts
 *
 * Environment variables:
 * - NOTION_API_KEY: Your Notion API key
 * - TEST_PAGE_ID: (Optional) Specific page ID to test with
 */

import { Client } from '@notionhq/client';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { NotionBlock } from '../src/lib/types';

// Configuration
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TEST_PAGE_ID = process.env.TEST_PAGE_ID;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function fetchBlocksRecursively(
  notion: Client,
  blockId: string,
  depth: number = 0
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];

  try {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
    });

    for (const block of response.results) {
      if (!('type' in block)) continue;

      const notionBlock = block as unknown as NotionBlock;

      // Fetch children if block has them (for tables, toggles, etc.)
      if (notionBlock.has_children && depth < 3) {
        const children = await fetchBlocksRecursively(notion, notionBlock.id, depth + 1);
        notionBlock.children = children;
      }

      blocks.push(notionBlock);
    }
  } catch (error) {
    console.error(`Error fetching blocks for ${blockId}:`, error);
  }

  return blocks;
}

async function testWithRealData() {
  logSection('NOTION PARSER INTEGRATION TEST');

  // Check for API key
  if (!NOTION_API_KEY) {
    log('ERROR: NOTION_API_KEY environment variable is not set', 'red');
    log('Please set it in your .env.local file or export it:', 'dim');
    log('  export NOTION_API_KEY=your_key_here', 'dim');
    process.exit(1);
  }

  // Initialize Notion client
  const notion = new Client({ auth: NOTION_API_KEY });
  log('Notion client initialized', 'green');

  // Get page ID
  let pageId = TEST_PAGE_ID;

  if (!pageId) {
    log('\nNo TEST_PAGE_ID provided. Looking for a page to test with...', 'yellow');

    // Try to find a page from the flax manual database if available
    // This is a fallback - in production, you'd set TEST_PAGE_ID
    try {
      // Try to search for any accessible page
      const searchResponse = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 1,
      });

      if (searchResponse.results.length > 0) {
        pageId = searchResponse.results[0].id;
        log(`Found page: ${pageId}`, 'cyan');
      } else {
        log('No pages found. Please set TEST_PAGE_ID environment variable.', 'red');
        process.exit(1);
      }
    } catch {
      log('Could not search for pages. Please set TEST_PAGE_ID environment variable.', 'red');
      process.exit(1);
    }
  }

  logSection('FETCHING BLOCKS FROM NOTION');
  log(`Page ID: ${pageId}`, 'dim');

  const blocks = await fetchBlocksRecursively(notion, pageId);
  log(`Fetched ${blocks.length} blocks from Notion`, 'green');

  // Log block type distribution
  const blockTypes: Record<string, number> = {};
  blocks.forEach((block) => {
    blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
  });

  log('\nNotion block type distribution:', 'cyan');
  Object.entries(blockTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  logSection('PARSING BLOCKS');

  const parsed = parseNotionBlocks(blocks);
  log(`Parsed into ${parsed.length} content sections`, 'green');

  // Count by section type
  const sectionTypes: Record<string, number> = {};
  parsed.forEach((section) => {
    sectionTypes[section.type] = (sectionTypes[section.type] || 0) + 1;
  });

  log('\nParsed section type distribution:', 'cyan');
  Object.entries(sectionTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const percentage = ((count / parsed.length) * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });

  logSection('SECTION PREVIEW');

  // Show first 5 sections
  const previewCount = Math.min(5, parsed.length);
  log(`Showing first ${previewCount} sections:\n`, 'dim');

  parsed.slice(0, previewCount).forEach((section, i) => {
    log(`--- Section ${i + 1}: ${section.type} ---`, 'yellow');

    // Show relevant details based on type
    switch (section.type) {
      case 'safety':
        console.log(`  Level: ${section.level}`);
        console.log(`  Content: ${section.content.substring(0, 100)}...`);
        break;

      case 'timeline':
        console.log(`  Rows: ${section.rows.length}`);
        if (section.rows[0]) {
          console.log(`  First row: ${section.rows[0].time} - ${section.rows[0].activity}`);
        }
        break;

      case 'checklist':
        console.log(`  Category: ${section.category}`);
        console.log(`  Title: ${section.title}`);
        console.log(`  Items: ${section.items.length}`);
        break;

      case 'outcomes':
        console.log(`  Title: ${section.title}`);
        console.log(`  Items: ${section.items.length}`);
        break;

      case 'checkpoint':
        console.log(`  Title: ${section.title}`);
        console.log(`  Criteria: ${section.items.length}`);
        break;

      case 'teaching-step':
        console.log(`  Step: ${section.stepNumber}`);
        console.log(`  Instruction: ${section.instruction.substring(0, 80)}...`);
        if (section.duration) console.log(`  Duration: ${section.duration}`);
        break;

      case 'vocabulary':
        console.log(`  Terms: ${section.terms.length}`);
        if (section.terms[0]) {
          console.log(`  First term: ${section.terms[0].term} - ${section.terms[0].definition.substring(0, 50)}...`);
        }
        break;

      case 'resource':
        console.log(`  Type: ${section.resourceType}`);
        console.log(`  URL: ${section.url.substring(0, 60)}...`);
        break;

      case 'prose':
        console.log(`  Content: ${section.content.substring(0, 100)}...`);
        break;

      case 'heading':
        console.log(`  Level: h${section.level}`);
        console.log(`  Text: ${section.text}`);
        break;
    }

    console.log('');
  });

  logSection('TEST COMPLETE');

  // Summary
  log('Summary:', 'bright');
  console.log(`  Total Notion blocks: ${blocks.length}`);
  console.log(`  Parsed sections: ${parsed.length}`);
  console.log(`  Section types: ${Object.keys(sectionTypes).length}`);

  // Check for expected types
  const expectedTypes = [
    'safety',
    'timeline',
    'checklist',
    'outcomes',
    'checkpoint',
    'teaching-step',
    'vocabulary',
    'resource',
    'prose',
    'heading',
  ];

  const foundTypes = Object.keys(sectionTypes);
  const missingTypes = expectedTypes.filter((t) => !foundTypes.includes(t));

  if (missingTypes.length > 0) {
    log(`\nNote: Some section types not detected: ${missingTypes.join(', ')}`, 'yellow');
    log('This is expected if the page does not contain all content types.', 'dim');
  } else {
    log('\nAll section types detected!', 'green');
  }

  log('\nIntegration test completed successfully.', 'green');
}

// Run the test
testWithRealData().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
