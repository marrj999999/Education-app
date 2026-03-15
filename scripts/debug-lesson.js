/**
 * Debug: Dump Notion block structure for a specific lesson
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

async function fetchBlocks(client, blockId, depth = 0, indent = '') {
  let cursor;
  do {
    await sleep(150);
    const response = await client.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    for (const block of response.results) {
      const data = block[block.type];
      const text = data?.rich_text ? extractRichText(data.rich_text) : '';
      const extra = [];

      if (block.type === 'table' && data) extra.push(`has_column_header=${data.has_column_header}, table_width=${data.table_width}`);
      if (block.type === 'callout' && data) extra.push(`color=${data.color}, icon=${data.icon?.emoji || 'none'}`);
      if (block.type === 'image' && data) extra.push(`url=${data.external?.url || data.file?.url || '?'}`);

      const hasChildren = block.has_children ? ' [HAS CHILDREN]' : '';
      const textPreview = text ? `: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"` : '';
      const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';

      console.log(`${indent}${block.type}${textPreview}${extraStr}${hasChildren}`);

      // Recurse into children (max depth 2 for debugging)
      if (block.has_children && depth < 2) {
        await fetchBlocks(client, block.id, depth + 1, indent + '  ');
      }
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
}

async function main() {
  const client = new Client({ auth: env.NOTION_API_KEY, timeoutMs: 30000 });

  // Get Module 2's child pages
  const courseId = env.NOTION_COURSE_NAV_ID;

  console.log('=== Fetching top-level pages ===');
  await sleep(150);
  const topLevel = await client.blocks.children.list({ block_id: courseId, page_size: 100 });

  const modulePages = [];
  for (const block of topLevel.results) {
    if (block.type === 'child_page') {
      const title = block.child_page.title;
      if (!title.toLowerCase().includes('resource') && !title.toLowerCase().includes('image') &&
          !title.toLowerCase().includes('accreditation') && !title.toLowerCase().includes('administration') &&
          !title.toLowerCase().includes('ocn') && !title.toLowerCase().includes('master style') &&
          !title.toLowerCase().includes('assessment handbook') && !title.toLowerCase().includes('health and safety handbook') &&
          !title.toLowerCase().includes('software') && !title.toLowerCase().includes('feedback') &&
          !title.toLowerCase().includes('style guide') && !title.toLowerCase().includes('template') &&
          !title.toLowerCase().includes('download') && !title.startsWith('📂')) {
        modulePages.push({ id: block.id, title });
      }
    }
  }

  console.log(`Found ${modulePages.length} modules:`);
  modulePages.forEach((m, i) => console.log(`  ${i+1}. ${m.title}`));

  // Get Module 2's lessons
  const module2 = modulePages[1]; // Module 2
  console.log(`\n=== Module 2: "${module2.title}" ===`);

  await sleep(150);
  const mod2Blocks = await client.blocks.children.list({ block_id: module2.id, page_size: 100 });

  const lessons = [];
  for (const block of mod2Blocks.results) {
    if (block.type === 'child_page') {
      lessons.push({ id: block.id, title: block.child_page.title });
    }
  }

  console.log(`Found ${lessons.length} lessons:`);
  lessons.forEach((l, i) => console.log(`  ${i+1}. ${l.title}`));

  // Debug Lesson 7 (index 1) — at 83% similarity
  const targetLesson = lessons[1]; // LESSON 7
  console.log(`\n=== Block structure for "${targetLesson.title}" ===\n`);
  await fetchBlocks(client, targetLesson.id);
}

main().catch(e => { console.error(e); process.exit(1); });
