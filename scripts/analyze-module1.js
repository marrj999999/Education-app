/**
 * Analyze Module 1 lessons from Notion — full block-by-block breakdown
 * Run: node scripts/analyze-module1.js
 */
const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const COURSE_NAV_ID = process.env.NOTION_COURSE_NAV_ID;

async function fetchBlocks(blockId, depth = 0) {
  const blocks = [];
  let cursor;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId, start_cursor: cursor, page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  if (depth < 3) {
    for (const block of blocks) {
      if (block.has_children) {
        block._children = await fetchBlocks(block.id, depth + 1);
      }
    }
  }
  return blocks;
}

function getText(richText) {
  if (!richText) return '';
  return richText.map(rt => rt.plain_text).join('');
}

function describeBlock(block, indent = '') {
  const type = block.type;
  let desc = `${indent}[${type}]`;

  if (block[type]?.rich_text) {
    const text = getText(block[type].rich_text);
    if (text) desc += ` "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;

    // Check for formatting
    const hasFormatting = block[type].rich_text.some(rt =>
      rt.annotations?.bold || rt.annotations?.italic || rt.annotations?.code || rt.href
    );
    if (hasFormatting) desc += ' [HAS FORMATTING]';
  }

  if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
    const text = getText(block[type].rich_text);
    desc = `${indent}[${type}] "${text}"`;
    if (block[type].is_toggleable) desc += ' [TOGGLEABLE]';
  }

  if (type === 'callout') {
    const icon = block.callout?.icon?.emoji || '';
    const color = block.callout?.color || '';
    const text = getText(block.callout.rich_text);
    desc = `${indent}[callout ${icon} ${color}] "${text.substring(0, 80)}"`;
  }

  if (type === 'table') {
    desc = `${indent}[table] ${block.table.table_width} cols`;
  }

  if (type === 'table_row') {
    const cells = block.table_row.cells.map(cell => getText(cell)).join(' | ');
    desc = `${indent}[row] ${cells.substring(0, 120)}`;
  }

  if (type === 'to_do') {
    const checked = block.to_do.checked ? '☑' : '☐';
    const text = getText(block.to_do.rich_text);
    desc = `${indent}[to_do ${checked}] "${text.substring(0, 80)}"`;
  }

  if (type === 'image') {
    const url = block.image?.file?.url || block.image?.external?.url || '';
    desc = `${indent}[image] ${url.substring(0, 60)}`;
  }

  if (type === 'video') {
    const url = block.video?.file?.url || block.video?.external?.url || '';
    desc = `${indent}[video] ${url.substring(0, 60)}`;
  }

  if (type === 'file') {
    const name = block.file?.name || getText(block.file?.caption) || '';
    const url = block.file?.file?.url || block.file?.external?.url || '';
    desc = `${indent}[file] "${name}" ${url.substring(0, 40)}`;
  }

  if (type === 'toggle') {
    const text = getText(block.toggle.rich_text);
    desc = `${indent}[toggle] "${text.substring(0, 80)}"`;
  }

  console.log(desc);

  if (block._children) {
    for (const child of block._children) {
      describeBlock(child, indent + '  ');
    }
  }
}

async function main() {
  console.log('Fetching course structure...');
  const navBlocks = await fetchBlocks(COURSE_NAV_ID, 0);

  // Find Module 1
  const module1 = navBlocks.find(b =>
    (b.type === 'child_page' && b.child_page?.title?.includes('MODULE 1')) ||
    (b.type === 'link_to_page')
  );

  // Get Module 1 page - it's the 4th child page (index 3 after filtering)
  const modulePages = navBlocks.filter(b =>
    b.type === 'child_page' && b.child_page?.title?.toLowerCase().startsWith('module')
  );

  if (modulePages.length === 0) {
    console.log('No module pages found');
    process.exit(1);
  }

  const mod1 = modulePages[0];
  console.log(`\nModule 1: "${mod1.child_page.title}" (${mod1.id})\n`);

  // Get lessons
  const lessonBlocks = await fetchBlocks(mod1.id, 0);
  const lessons = lessonBlocks.filter(b => b.type === 'child_page');

  console.log(`Found ${lessons.length} lessons:`);
  for (const l of lessons) {
    console.log(`  - ${l.child_page.title} (${l.id})`);
  }

  // Analyze each lesson
  for (const lesson of lessons) {
    console.log('\n' + '='.repeat(80));
    console.log(`LESSON: ${lesson.child_page.title}`);
    console.log('='.repeat(80));

    const blocks = await fetchBlocks(lesson.id);
    console.log(`Total blocks: ${blocks.length}\n`);

    // Count by type
    const counts = {};
    function countAll(bs) {
      for (const b of bs) {
        counts[b.type] = (counts[b.type] || 0) + 1;
        if (b._children) countAll(b._children);
      }
    }
    countAll(blocks);
    console.log('Block type counts:');
    for (const [t, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${t}: ${c}`);
    }

    console.log('\nFull block tree:');
    for (const block of blocks) {
      describeBlock(block);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
