/**
 * Quick comparison: Fetch first lesson from Notion, compare with Payload DB.
 * Run: node scripts/quick-compare.js
 */

const { Client } = require('@notionhq/client');
const { Pool } = require('pg');

// Load env
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const COURSE_NAV_ID = process.env.NOTION_COURSE_NAV_ID;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fetchNotionBlocks(blockId, depth = 0) {
  const blocks = [];
  let cursor;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  if (depth < 3) {
    for (const block of blocks) {
      if (block.has_children) {
        block.children = await fetchNotionBlocks(block.id, depth + 1);
      }
    }
  }
  return blocks;
}

function extractText(blocks, indent = '') {
  const texts = [];
  for (const block of blocks) {
    const type = block.type;
    let text = '';

    if (block[type]?.rich_text) {
      text = block[type].rich_text.map(rt => rt.plain_text).join('');
    } else if (block[type]?.title) {
      text = block[type].title;
    }

    if (text) {
      texts.push(`${indent}[${type}] ${text.substring(0, 100)}`);
    } else {
      texts.push(`${indent}[${type}]`);
    }

    if (block.children && block.children.length > 0) {
      texts.push(...extractText(block.children, indent + '  '));
    }
  }
  return texts;
}

async function main() {
  console.log('=== Quick Notion vs Payload Comparison ===\n');

  // Step 1: Fetch course structure from Notion
  console.log('1. Fetching course structure from Notion...');
  const navBlocks = await fetchNotionBlocks(COURSE_NAV_ID, 0);

  const childPages = navBlocks
    .filter(b => b.type === 'child_page' || b.type === 'link_to_page')
    .map(b => ({
      id: b.id,
      title: b.type === 'child_page' ? b.child_page?.title : 'linked page',
      type: b.type,
    }));

  console.log(`   Found ${childPages.length} top-level pages (modules):`);
  for (const p of childPages) {
    console.log(`   - ${p.title} (${p.id})`);
  }

  // Step 2: Get first actual module's lessons (skip non-module pages)
  const modulePages = childPages.filter(p =>
    p.title.toLowerCase().startsWith('module') ||
    p.title.toLowerCase().startsWith('lesson')
  );

  console.log(`\n   Filtered to ${modulePages.length} actual modules:`);
  for (const m of modulePages) {
    console.log(`   - ${m.title}`);
  }

  if (modulePages.length === 0) {
    console.log('No modules found!');
    process.exit(1);
  }

  const firstModule = modulePages[0];
  console.log(`\n2. Fetching lessons from first module: "${firstModule.title}"...`);

  let moduleId = firstModule.id;
  if (firstModule.type === 'link_to_page') {
    const page = await notion.pages.retrieve({ page_id: firstModule.id });
    moduleId = page.id;
  }

  const moduleBlocks = await fetchNotionBlocks(moduleId, 0);
  const lessonPages = moduleBlocks
    .filter(b => b.type === 'child_page' || b.type === 'link_to_page')
    .map(b => ({
      id: b.type === 'child_page' ? b.id : b.link_to_page?.page_id,
      title: b.type === 'child_page' ? b.child_page?.title : 'linked',
    }));

  console.log(`   Found ${lessonPages.length} lessons:`);
  for (const l of lessonPages) {
    console.log(`   - ${l.title} (${l.id})`);
  }

  // Step 3: Fetch first lesson content from Notion
  if (lessonPages.length === 0) {
    console.log('No lessons found!');
    process.exit(1);
  }

  const firstLesson = lessonPages[0];
  console.log(`\n3. Fetching FULL content of first lesson: "${firstLesson.title}"...`);

  const lessonBlocks = await fetchNotionBlocks(firstLesson.id);
  console.log(`   Total blocks: ${lessonBlocks.length}`);

  // Count by type
  const typeCounts = {};
  function countTypes(blocks) {
    for (const b of blocks) {
      typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
      if (b.children) countTypes(b.children);
    }
  }
  countTypes(lessonBlocks);

  console.log('   Block types:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${type}: ${count}`);
  }

  // Step 4: Show text content preview
  console.log('\n4. Notion content preview (first 50 items):');
  const textItems = extractText(lessonBlocks);
  for (const item of textItems.slice(0, 50)) {
    console.log(`   ${item}`);
  }
  if (textItems.length > 50) {
    console.log(`   ... and ${textItems.length - 50} more items`);
  }

  // Step 5: Check Payload DB
  console.log('\n5. Checking Payload DB for lessons...');
  try {
    const result = await pool.query(`
      SELECT l.id, l.title, l.slug,
        (SELECT count(*) FROM payload.lessons_blocks_heading WHERE _parent_id = l.id) as headings,
        (SELECT count(*) FROM payload.lessons_blocks_prose WHERE _parent_id = l.id) as prose,
        (SELECT count(*) FROM payload.lessons_blocks_safety WHERE _parent_id = l.id) as safety,
        (SELECT count(*) FROM payload.lessons_blocks_teaching_step WHERE _parent_id = l.id) as teaching_steps,
        (SELECT count(*) FROM payload.lessons_blocks_checklist WHERE _parent_id = l.id) as checklists,
        (SELECT count(*) FROM payload.lessons_blocks_timeline WHERE _parent_id = l.id) as timelines,
        (SELECT count(*) FROM payload.lessons_blocks_checkpoint WHERE _parent_id = l.id) as checkpoints,
        (SELECT count(*) FROM payload.lessons_blocks_outcomes WHERE _parent_id = l.id) as outcomes,
        (SELECT count(*) FROM payload.lessons_blocks_resource WHERE _parent_id = l.id) as resources
      FROM payload.lessons l
      ORDER BY l.id
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`   First Payload lesson: "${row.title}" (id: ${row.id})`);
      console.log(`   Blocks: ${row.headings} headings, ${row.prose} prose, ${row.safety} safety, ${row.teaching_steps} teaching steps`);
      console.log(`   More: ${row.checklists} checklists, ${row.timelines} timelines, ${row.checkpoints} checkpoints, ${row.outcomes} outcomes, ${row.resources} resources`);
      const totalBlocks = Object.values(row).filter((v, i) => i > 2 && typeof v === 'string').reduce((sum, v) => sum + parseInt(v), 0);
      console.log(`   Total Payload blocks: ${totalBlocks}`);
    }

    // Also get prose content for comparison
    const proseResult = await pool.query(`
      SELECT id, content FROM payload.lessons_blocks_prose
      WHERE _parent_id = (SELECT id FROM payload.lessons ORDER BY id LIMIT 1)
      ORDER BY _order
      LIMIT 3
    `);

    if (proseResult.rows.length > 0) {
      console.log('\n   Payload prose preview (first 3 blocks):');
      for (const row of proseResult.rows) {
        const content = row.content;
        if (content?.root?.children) {
          const text = content.root.children
            .map(node => {
              if (node.children) {
                return node.children.map(c => c.text || '').join('');
              }
              return '';
            })
            .join(' | ')
            .substring(0, 150);
          console.log(`     "${text}..."`);
        }
      }
    }

  } catch (error) {
    console.error('   DB error:', error.message);
  }

  console.log('\n=== Done ===');
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
