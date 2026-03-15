/**
 * Debug: Dump block structure for ALL failing lessons
 * Identifies patterns causing content gaps
 */
const { Client } = require('@notionhq/client');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      env[key] = val;
    }
  }
});

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractRichText(rt) {
  if (!rt || !Array.isArray(rt)) return '';
  return rt.map(t => t.plain_text || '').join('');
}

async function fetchBlocks(client, blockId, depth = 0) {
  const blocks = [];
  let cursor;
  do {
    await sleep(150);
    const response = await client.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  if (depth <= 3) {
    for (const block of blocks) {
      if (block.has_children) {
        try {
          block.children = await fetchBlocks(client, block.id, depth + 1);
        } catch { block.children = []; }
      }
    }
  }
  return blocks;
}

function dumpBlock(block, indent = '') {
  const data = block[block.type];
  const text = data?.rich_text ? extractRichText(data.rich_text) : '';
  const extra = [];

  if (block.type === 'table' && data) extra.push(`cols=${data.table_width}, header=${data.has_column_header}`);
  if (block.type === 'callout' && data) extra.push(`color=${data.color}, icon=${data.icon?.emoji || 'none'}`);
  if (block.type === 'image') extra.push('image');

  const hasChildren = block.has_children ? ` [${block.children?.length || '?'} children]` : '';
  const textPreview = text ? `: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"` : '';
  const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';

  console.log(`${indent}${block.type}${textPreview}${extraStr}${hasChildren}`);

  // For tables, show header row
  if (block.type === 'table' && block.children) {
    const rows = block.children.filter(c => c.type === 'table_row');
    if (rows.length > 0) {
      const headerCells = rows[0].table_row.cells.map(cell => extractRichText(cell));
      console.log(`${indent}  HEADERS: [${headerCells.join(' | ')}]`);
      // Show first data row
      if (rows.length > 1) {
        const dataCells = rows[1].table_row.cells.map(cell => extractRichText(cell));
        console.log(`${indent}  ROW 1: [${dataCells.join(' | ')}]`);
        console.log(`${indent}  ... (${rows.length - 1} data rows total)`);
      }
    }
  }

  // For callouts, show children
  if (block.type === 'callout' && block.children) {
    for (const child of block.children) {
      dumpBlock(child, indent + '  ');
    }
  }

  // For toggle blocks, show children
  if (block.type === 'toggle' && block.children) {
    for (const child of block.children) {
      dumpBlock(child, indent + '  ');
    }
  }
}

async function main() {
  const client = new Client({ auth: env.NOTION_API_KEY, timeoutMs: 30000 });
  const courseId = env.NOTION_COURSE_NAV_ID;

  // Get module structure
  console.log('=== Fetching course structure ===');
  await sleep(150);
  const topLevel = await client.blocks.children.list({ block_id: courseId, page_size: 100 });

  const modulePages = [];
  for (const block of topLevel.results) {
    if (block.type === 'child_page') {
      const title = block.child_page.title;
      const lower = title.toLowerCase();
      if (!lower.includes('resource') && !lower.includes('image') &&
          !lower.includes('accreditation') && !lower.includes('administration') &&
          !lower.includes('ocn') && !lower.includes('master style') &&
          !lower.includes('assessment handbook') && !lower.includes('health and safety handbook') &&
          !lower.includes('software') && !lower.includes('feedback') &&
          !lower.includes('style guide') && !lower.includes('template') &&
          !lower.includes('download') && !title.startsWith('📂')) {
        modulePages.push({ id: block.id, title });
      }
    }
  }

  console.log(`Found ${modulePages.length} modules\n`);

  // Failing lessons identified from comparison:
  // Module 1 Lesson 2 (STRUCTURAL PROPERTIES) - 82%
  // Module 2 Lesson 1-5 (Lessons 6-10) - all failing
  // Module 5 (direct content) - 80%
  // Module 6 (direct content) - 64%

  // Debug Module 1, Lesson 2
  console.log('\n' + '='.repeat(80));
  console.log('MODULE 1, LESSON 2: STRUCTURAL PROPERTIES OF BAMBOO');
  console.log('='.repeat(80));
  await sleep(200);
  const mod1Children = await client.blocks.children.list({ block_id: modulePages[0].id, page_size: 100 });
  const mod1Lessons = mod1Children.results.filter(b => b.type === 'child_page');
  if (mod1Lessons.length >= 2) {
    const blocks = await fetchBlocks(client, mod1Lessons[1].id);
    for (const block of blocks) dumpBlock(block);
  }

  // Debug Module 2, Lesson 1 (Lesson 6)
  console.log('\n' + '='.repeat(80));
  console.log('MODULE 2, LESSON 1: BICYCLE INTRODUCTION (Lesson 6)');
  console.log('='.repeat(80));
  await sleep(200);
  const mod2Children = await client.blocks.children.list({ block_id: modulePages[1].id, page_size: 100 });
  const mod2Lessons = mod2Children.results.filter(b => b.type === 'child_page');
  if (mod2Lessons.length >= 1) {
    const blocks = await fetchBlocks(client, mod2Lessons[0].id);
    for (const block of blocks) dumpBlock(block);
  }

  // Debug Module 2, Lesson 5 (Lesson 10 - worst in Module 2)
  console.log('\n' + '='.repeat(80));
  console.log('MODULE 2, LESSON 5: BICYCLE COMPANY CREATION (Lesson 10)');
  console.log('='.repeat(80));
  if (mod2Lessons.length >= 5) {
    const blocks = await fetchBlocks(client, mod2Lessons[4].id);
    for (const block of blocks) dumpBlock(block);
  }

  // Debug Module 6 (direct content - worst overall at 64%)
  console.log('\n' + '='.repeat(80));
  console.log('MODULE 6: RECYCLING AND BREAKDOWN (direct content)');
  console.log('='.repeat(80));
  await sleep(200);
  const mod6Blocks = await fetchBlocks(client, modulePages[5].id);
  const contentBlocks = mod6Blocks.filter(b => b.type !== 'child_page' && b.type !== 'child_database');
  for (const block of contentBlocks) dumpBlock(block);
}

main().catch(e => { console.error(e); process.exit(1); });
