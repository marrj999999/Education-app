/**
 * Debug: Dump block structure for remaining 4 failing lessons
 * Lessons 7, 8, 9 (Module 2) and Module 5 (direct content)
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
        try { block.children = await fetchBlocks(client, block.id, depth + 1); }
        catch { block.children = []; }
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
  const hasChildren = block.has_children ? ` [${block.children?.length || '?'} children]` : '';
  const textPreview = text ? `: "${text.substring(0, 120)}${text.length > 120 ? '...' : ''}"` : '';
  const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';
  console.log(`${indent}${block.type}${textPreview}${extraStr}${hasChildren}`);

  if (block.type === 'table' && block.children) {
    const rows = block.children.filter(c => c.type === 'table_row');
    if (rows.length > 0) {
      const headerCells = rows[0].table_row.cells.map(cell => extractRichText(cell));
      console.log(`${indent}  HEADERS: [${headerCells.join(' | ')}]`);
      if (rows.length > 1) {
        const dataCells = rows[1].table_row.cells.map(cell => extractRichText(cell));
        console.log(`${indent}  ROW 1: [${dataCells.join(' | ')}]`);
        console.log(`${indent}  ... (${rows.length - 1} data rows total)`);
      }
    }
  }
  if ((block.type === 'callout' || block.type === 'toggle') && block.children) {
    for (const child of block.children) dumpBlock(child, indent + '  ');
  }
}

async function main() {
  const client = new Client({ auth: env.NOTION_API_KEY, timeoutMs: 30000 });
  const courseId = env.NOTION_COURSE_NAV_ID;

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

  // Module 2 lessons
  await sleep(200);
  const mod2Children = await client.blocks.children.list({ block_id: modulePages[1].id, page_size: 100 });
  const mod2Lessons = mod2Children.results.filter(b => b.type === 'child_page');

  // Lesson 7 (index 1)
  console.log('\n' + '='.repeat(80));
  console.log('LESSON 7: BICYCLE TYPES');
  console.log('='.repeat(80));
  const l7Blocks = await fetchBlocks(client, mod2Lessons[1].id);
  for (const block of l7Blocks) dumpBlock(block);

  // Lesson 8 (index 2)
  console.log('\n' + '='.repeat(80));
  console.log('LESSON 8: BICYCLE COMPONENTS');
  console.log('='.repeat(80));
  const l8Blocks = await fetchBlocks(client, mod2Lessons[2].id);
  for (const block of l8Blocks) dumpBlock(block);

  // Lesson 9 (index 3)
  console.log('\n' + '='.repeat(80));
  console.log('LESSON 9: BICYCLE GEOMETRY');
  console.log('='.repeat(80));
  const l9Blocks = await fetchBlocks(client, mod2Lessons[3].id);
  for (const block of l9Blocks) dumpBlock(block);

  // Module 5 (direct content)
  console.log('\n' + '='.repeat(80));
  console.log('MODULE 5: BICYCLE COMPONENTS (direct content)');
  console.log('='.repeat(80));
  await sleep(200);
  const mod5Blocks = await fetchBlocks(client, modulePages[4].id);
  const contentBlocks = mod5Blocks.filter(b => b.type !== 'child_page' && b.type !== 'child_database');
  for (const block of contentBlocks) dumpBlock(block);
}

main().catch(e => { console.error(e); process.exit(1); });
