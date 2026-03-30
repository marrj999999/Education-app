/**
 * Detailed comparison: Notion blocks vs Payload content for lesson 1.
 * Extracts ALL text from both and compares word-by-word.
 * Run: node scripts/detailed-compare.js
 */

const { Client } = require('@notionhq/client');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// First lesson's Notion page ID (from quick-compare output)
const LESSON_1_NOTION_ID = '1a44c615-3ed9-80d7-a6af-caddc7006631';
const LESSON_1_PAYLOAD_ID = 13;

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

function extractAllNotionText(blocks) {
  const texts = [];
  for (const block of blocks) {
    const type = block.type;
    if (block[type]?.rich_text) {
      const text = block[type].rich_text.map(rt => rt.plain_text).join('');
      if (text.trim()) texts.push(text.trim());
    }
    if (block[type]?.title) {
      texts.push(block[type].title.trim());
    }
    // Table rows
    if (type === 'table_row' && block.table_row?.cells) {
      const cellTexts = block.table_row.cells
        .map(cell => cell.map(rt => rt.plain_text).join(''))
        .filter(t => t.trim());
      if (cellTexts.length) texts.push(cellTexts.join(' | '));
    }
    if (block.children) {
      texts.push(...extractAllNotionText(block.children));
    }
  }
  return texts;
}

function extractLexicalText(content) {
  if (!content?.root?.children) return '';
  function extract(children) {
    return children.map(c => {
      if (c.type === 'text') return c.text || '';
      if (c.children) return extract(c.children);
      return '';
    }).join('');
  }
  return content.root.children.map(n => n.children ? extract(n.children) : '').join('\n');
}

async function main() {
  console.log('=== Detailed Content Comparison: Lesson 1 ===\n');

  // 1. Fetch Notion content
  console.log('Fetching Notion content...');
  const notionBlocks = await fetchNotionBlocks(LESSON_1_NOTION_ID);
  const notionTexts = extractAllNotionText(notionBlocks);
  const notionAllText = notionTexts.join('\n');
  const notionWords = notionAllText.split(/\s+/).filter(w => w.length > 2);

  console.log(`Notion: ${notionTexts.length} text items, ${notionWords.length} words\n`);

  // 2. Fetch Payload content
  console.log('Fetching Payload content...');
  const payloadTexts = [];

  // Headings
  const headings = await pool.query(
    'SELECT text FROM payload.lessons_blocks_heading WHERE _parent_id = $1 ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of headings.rows) {
    if (row.text?.trim()) payloadTexts.push(row.text.trim());
  }

  // Prose (Lexical)
  const prose = await pool.query(
    'SELECT content FROM payload.lessons_blocks_prose WHERE _parent_id = $1 ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of prose.rows) {
    const text = extractLexicalText(row.content);
    if (text.trim()) payloadTexts.push(text.trim());
  }

  // Safety
  const safety = await pool.query(
    'SELECT title, content FROM payload.lessons_blocks_safety WHERE _parent_id = $1 ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of safety.rows) {
    if (row.title?.trim()) payloadTexts.push(row.title.trim());
    if (row.content?.trim()) payloadTexts.push(row.content.trim());
  }

  // Safety items
  const safetyItems = await pool.query(
    'SELECT text FROM payload.lessons_blocks_safety_items WHERE _parent_id IN (SELECT id FROM payload.lessons_blocks_safety WHERE _parent_id = $1) ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of safetyItems.rows) {
    if (row.text?.trim()) payloadTexts.push(row.text.trim());
  }

  // Teaching steps
  const steps = await pool.query(
    'SELECT id, title, instruction, teaching_approach, differentiation, duration FROM payload.lessons_blocks_teaching_step WHERE _parent_id = $1 ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of steps.rows) {
    if (row.title?.trim()) payloadTexts.push(row.title.trim());
    if (row.instruction?.trim()) payloadTexts.push(row.instruction.trim());
    if (row.teaching_approach?.trim()) payloadTexts.push(row.teaching_approach.trim());
    if (row.differentiation?.trim()) payloadTexts.push(row.differentiation.trim());

    // Step activities
    const activities = await pool.query(
      'SELECT text FROM payload.lessons_blocks_teaching_step_activities WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const a of activities.rows) {
      if (a.text?.trim()) payloadTexts.push(a.text.trim());
    }

    // Step paragraphs
    const paragraphs = await pool.query(
      'SELECT text FROM payload.lessons_blocks_teaching_step_paragraphs WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const p of paragraphs.rows) {
      if (p.text?.trim()) payloadTexts.push(p.text.trim());
    }

    // Step tips
    const tips = await pool.query(
      'SELECT text FROM payload.lessons_blocks_teaching_step_tips WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const t of tips.rows) {
      if (t.text?.trim()) payloadTexts.push(t.text.trim());
    }

    // Step warnings
    const warnings = await pool.query(
      'SELECT text FROM payload.lessons_blocks_teaching_step_warnings WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const w of warnings.rows) {
      if (w.text?.trim()) payloadTexts.push(w.text.trim());
    }

    // Step quotes
    const quotes = await pool.query(
      'SELECT text FROM payload.lessons_blocks_teaching_step_quotes WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const q of quotes.rows) {
      if (q.text?.trim()) payloadTexts.push(q.text.trim());
    }
  }

  // Checklists
  const checklists = await pool.query(
    'SELECT id, title FROM payload.lessons_blocks_checklist WHERE _parent_id = $1 ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of checklists.rows) {
    if (row.title?.trim()) payloadTexts.push(row.title.trim());
    const items = await pool.query(
      'SELECT text FROM payload.lessons_blocks_checklist_items WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const item of items.rows) {
      if (item.text?.trim()) payloadTexts.push(item.text.trim());
    }
  }

  // Checkpoints
  const checkpoints = await pool.query(
    'SELECT id, title FROM payload.lessons_blocks_checkpoint WHERE _parent_id = $1 ORDER BY _order',
    [LESSON_1_PAYLOAD_ID]
  );
  for (const row of checkpoints.rows) {
    if (row.title?.trim()) payloadTexts.push(row.title.trim());
    const items = await pool.query(
      'SELECT criterion, description FROM payload.lessons_blocks_checkpoint_items WHERE _parent_id = $1 ORDER BY _order',
      [row.id]
    );
    for (const item of items.rows) {
      if (item.criterion?.trim()) payloadTexts.push(item.criterion.trim());
      if (item.description?.trim()) payloadTexts.push(item.description.trim());
    }
  }

  const payloadAllText = payloadTexts.join('\n');
  const payloadWords = payloadAllText.split(/\s+/).filter(w => w.length > 2);

  console.log(`Payload: ${payloadTexts.length} text items, ${payloadWords.length} words\n`);

  // 3. Word-level comparison
  const notionWordSet = new Set(notionWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const payloadWordSet = new Set(payloadWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const commonWords = new Set([...notionWordSet].filter(w => payloadWordSet.has(w)));
  const notionOnly = [...notionWordSet].filter(w => !payloadWordSet.has(w) && w.length > 3);
  const payloadOnly = [...payloadWordSet].filter(w => !notionWordSet.has(w) && w.length > 3);

  const totalUniqueWords = new Set([...notionWordSet, ...payloadWordSet]);
  const similarity = (commonWords.size / totalUniqueWords.size * 100).toFixed(1);

  console.log(`=== Word-Level Similarity: ${similarity}% ===`);
  console.log(`Common words: ${commonWords.size}`);
  console.log(`Notion-only unique words: ${notionOnly.length}`);
  console.log(`Payload-only unique words: ${payloadOnly.length}\n`);

  if (notionOnly.length > 0) {
    console.log('Words in NOTION but missing from PAYLOAD (sample):');
    for (const w of notionOnly.slice(0, 30)) {
      console.log(`  - "${w}"`);
    }
    if (notionOnly.length > 30) console.log(`  ... and ${notionOnly.length - 30} more\n`);
  }

  if (payloadOnly.length > 0) {
    console.log('\nWords in PAYLOAD but not in NOTION (sample):');
    for (const w of payloadOnly.slice(0, 20)) {
      console.log(`  + "${w}"`);
    }
  }

  // 4. Check for specific important content
  console.log('\n=== Key Content Checks ===');

  function checkContent(label, searchTerm) {
    const inNotion = notionAllText.toLowerCase().includes(searchTerm.toLowerCase());
    const inPayload = payloadAllText.toLowerCase().includes(searchTerm.toLowerCase());
    const status = inNotion && inPayload ? '✅' : inNotion && !inPayload ? '❌ MISSING' : '⚠️';
    console.log(`${status} ${label}: Notion=${inNotion}, Payload=${inPayload}`);
  }

  checkContent('Teaching Approach', 'teaching approach');
  checkContent('Differentiation', 'differentiation');
  checkContent('Safety', 'safety');
  checkContent('Workshop Safety', 'workshop safety');
  checkContent('PPE', 'ppe');
  checkContent('Tool Safety', 'tool safety');
  checkContent('Session Timeline', 'session timeline');
  checkContent('Assessment', 'assessment');
  checkContent('Learner', 'learner');
  checkContent('Emergency', 'emergency');

  console.log('\n=== Done ===');
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
  process.exit(1);
});
