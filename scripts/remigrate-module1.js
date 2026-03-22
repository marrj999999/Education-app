/**
 * Re-migrate Module 1 lessons (L13, L14, L15) with improved parsing.
 *
 * Fixes:
 * 1. Tables → proper timeline/checklist/checkpoint blocks (not pipe-separated prose)
 * 2. Toggle artifacts removed ("Toggle to view...")
 * 3. Bullet lists split properly (not concatenated with |)
 * 4. To-do items → checklist items
 * 5. Callout durations captured in teaching steps
 * 6. Consistent heading cleanup (remove page numbers, normalize emoji usage)
 *
 * Run: node scripts/remigrate-module1.js [--dry-run]
 */

const { Client } = require('@notionhq/client');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Lesson IDs in Payload
const LESSONS = [
  { payloadId: 13, notionId: '1a44c615-3ed9-80d7-a6af-caddc7006631', title: 'LESSON 1' },
  { payloadId: 14, notionId: '1a44c615-3ed9-8038-82db-e1650859d0ff', title: 'LESSON 2' },
  { payloadId: 15, notionId: '1a44c615-3ed9-80b0-959b-eec60da86c07', title: 'LESSON 3/4/5' },
];

// ─── Notion helpers ──────────────────────────────────────────────────────────

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

function getFormattedText(richText) {
  if (!richText) return '';
  return richText.map(rt => {
    let text = rt.plain_text;
    if (rt.annotations?.bold) text = `**${text}**`;
    if (rt.annotations?.italic) text = `*${text}*`;
    return text;
  }).join('');
}

// ─── Block → Payload section converter ───────────────────────────────────────

function convertBlocks(blocks) {
  const sections = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const type = block.type;

    // Skip dividers and empty paragraphs
    if (type === 'divider') { i++; continue; }
    if (type === 'paragraph' && !getText(block.paragraph?.rich_text).trim()) { i++; continue; }

    // ── TABLE → detect type and create proper block ──
    if (type === 'table') {
      const rows = (block._children || []).filter(c => c.type === 'table_row');
      const headers = rows.length > 0
        ? rows[0].table_row.cells.map(cell => getText(cell))
        : [];
      const dataRows = rows.slice(1).map(r =>
        r.table_row.cells.map(cell => getText(cell))
      );

      const headerLower = headers.map(h => h.toLowerCase());

      // Timeline detection: has time/section + activity/content + duration/time columns
      if ((headerLower.includes('time') || headerLower.includes('section')) &&
          (headerLower.includes('activity') || headerLower.includes('content'))) {
        sections.push({
          blockType: 'timeline',
          title: null,
          rows: dataRows.map(row => ({
            time: row[0] || '',
            activity: row[1] || '',
            duration: row[2] || '',
            notes: row[3] || null,
          })),
        });
        i++; continue;
      }

      // Checklist/materials detection: has item + quantity columns
      if (headerLower.includes('item') || headerLower.includes('items') ||
          headerLower.some(h => h.includes('material')) ||
          headerLower.some(h => h.includes('quantity'))) {
        sections.push({
          blockType: 'checklist',
          title: 'Materials & Equipment',
          category: 'materials',
          items: dataRows.map(row => ({
            text: row[0] || '',
            quantity: row[1] || null,
          })).filter(item => item.text.trim()),
        });
        i++; continue;
      }

      // Assessment/checkpoint detection: has criteria/code columns
      if (headerLower.some(h => h.includes('criteria') || h.includes('code') || h.includes('ocn'))) {
        sections.push({
          blockType: 'checkpoint',
          title: 'OCN Assessment Criteria',
          items: dataRows.map(row => ({
            criterion: row[0] || '',
            description: row.slice(1).filter(Boolean).join(' — ') || null,
          })).filter(item => item.criterion.trim()),
        });
        i++; continue;
      }

      // Detail/info table → prose with formatted content
      if (headerLower.includes('detail') || headerLower.includes('element') ||
          headerLower.includes('document')) {
        const text = dataRows.map(row => `${row[0]}: ${row.slice(1).join(', ')}`).join('\n');
        sections.push({
          blockType: 'prose',
          content: createLexical(text),
        });
        i++; continue;
      }

      // Vocabulary table
      if (headerLower.includes('term') && headerLower.includes('definition')) {
        sections.push({
          blockType: 'vocabulary',
          terms: dataRows.map(row => ({
            term: row[0] || '',
            definition: row[1] || '',
          })).filter(t => t.term.trim()),
        });
        i++; continue;
      }

      // Day schedule table (for multi-day lessons)
      if (headerLower.includes('time') && headerLower.some(h => h.includes('security'))) {
        sections.push({
          blockType: 'timeline',
          title: null,
          rows: dataRows.map(row => ({
            time: row[0] || '',
            activity: row[1] || '',
            duration: '',
            notes: row[2] || null,
          })),
        });
        i++; continue;
      }

      // Generic table → prose fallback
      const tableText = [headers.join(' | '), ...dataRows.map(r => r.join(' | '))].join('\n');
      sections.push({ blockType: 'prose', content: createLexical(tableText) });
      i++; continue;
    }

    // ── HEADING ──
    if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
      const text = getText(block[type].rich_text);
      const level = type === 'heading_1' ? 1 : type === 'heading_2' ? 2 : 3;

      // Skip empty headings
      if (!text.trim()) { i++; continue; }

      // Clean heading text: remove page numbers, excessive emoji
      let cleanText = text
        .replace(/^📌\s*PAGE\s*\d+:\s*/i, '')
        .replace(/^📋\s*/, '')
        .replace(/^📑\s*/, '')
        .replace(/^🔍\s*/, '')
        .replace(/^🔨\s*/, '')
        .replace(/^🎨\s*/, '')
        .replace(/^📝\s*/, '')
        .replace(/^✅\s*/, '')
        .replace(/^🔴\s*/, '')
        .replace(/^⏱️\s*/, '')
        .replace(/^🔄\s*/, '')
        .replace(/^💡\s*/, '')
        .replace(/^🧩\s*/, '')
        .trim();

      // Skip "TEACHING SEQUENCE" callout headings (they're structural, not content)
      if (cleanText === 'TEACHING SEQUENCE') { i++; continue; }

      // Check if this is a SECTION heading (teaching step pattern)
      const sectionMatch = cleanText.match(/^SECTION\s+(\d+):\s*(.+)/i);
      if (sectionMatch) {
        const stepNumber = parseInt(sectionMatch[1]);
        const stepTitle = sectionMatch[2].trim();

        // Collect teaching step content
        i++;
        let duration = null;
        const activities = [];
        let teachingApproach = null;
        let differentiation = null;
        const paragraphs = [];

        while (i < blocks.length) {
          const b = blocks[i];
          const bt = b.type;

          // Stop at next SECTION heading (any level) or major structural heading
          if (bt === 'heading_1' || bt === 'heading_2' || bt === 'heading_3') {
            const nextText = getText(b[bt].rich_text);
            // Stop if this is another SECTION heading
            if (nextText.match(/^SECTION\s+\d+/i)) break;
            // Stop if this is a structural heading (emoji-prefixed or major sections)
            if (bt !== 'heading_3' && nextText.match(/^[📋📌🔴⏱️💡🧩🔄✅📑🎓]/)) break;
            // Stop at h2 headings that aren't sub-content
            if (bt === 'heading_2') break;
          }
          if (bt === 'divider') { i++; continue; }

          // Callout with duration
          if (bt === 'callout') {
            const calloutText = getText(b.callout?.rich_text);
            const durationMatch = calloutText.match(/(\d+)\s*minutes?/i);
            if (durationMatch) {
              duration = `${durationMatch[1]} min`;
            }
            i++; continue;
          }

          // Bullet items → activities
          if (bt === 'bulleted_list_item') {
            activities.push({ text: getText(b.bulleted_list_item.rich_text), duration: null });
            i++; continue;
          }

          // To-do items → activities
          if (bt === 'to_do') {
            activities.push({ text: getText(b.to_do.rich_text), duration: null });
            i++; continue;
          }

          // Paragraphs with teaching approach / differentiation
          if (bt === 'paragraph') {
            const pText = getFormattedText(b.paragraph.rich_text);
            if (pText.startsWith('Teaching Approach:') || pText.startsWith('**Teaching Approach:**')) {
              teachingApproach = pText.replace(/^\*?\*?Teaching Approach:\*?\*?\s*/i, '').trim();
            } else if (pText.startsWith('Differentiation:') || pText.startsWith('**Differentiation:**')) {
              differentiation = pText.replace(/^\*?\*?Differentiation:\*?\*?\s*/i, '').trim();
            } else if (pText.trim()) {
              // Sub-heading style text (e.g., "Bamboo Basics (20 min):")
              const subMatch = pText.match(/^(.+?)\s*\((\d+)\s*min\):/);
              if (subMatch) {
                paragraphs.push(pText);
              } else if (!pText.startsWith('Key Script:') && !pText.startsWith('Engagement Question:')) {
                paragraphs.push(pText);
              } else {
                paragraphs.push(pText);
              }
            }
            i++; continue;
          }

          // Quote blocks
          if (bt === 'quote') {
            paragraphs.push(`> ${getText(b.quote.rich_text)}`);
            i++; continue;
          }

          i++; // Skip other block types
        }

        sections.push({
          blockType: 'teachingStep',
          stepNumber,
          title: stepTitle,
          instruction: activities.length > 0
            ? activities.map(a => a.text).join('\n')
            : paragraphs.length > 0 ? paragraphs[0] : stepTitle,
          duration,
          teachingApproach,
          differentiation,
          paragraphs: paragraphs.length > 0 ? paragraphs.map(p => ({ text: p })) : [],
          tips: [],
          warnings: [],
          activities: activities.map(a => ({ text: a.text, duration: a.duration })),
          resources: [],
          tables: [],
          quotes: [],
        });
        continue; // Don't increment i, already advanced
      }

      // Regular heading
      sections.push({
        blockType: 'heading',
        level: String(level),
        text: cleanText,
      });
      i++; continue;
    }

    // ── CALLOUT ──
    if (type === 'callout') {
      const color = block.callout?.color || '';
      const icon = block.callout?.icon?.emoji || '';
      const text = getText(block.callout?.rich_text);

      // Safety callout (red/yellow)
      if (color.includes('red') || color.includes('yellow')) {
        // Collect children text
        const childTexts = (block._children || [])
          .map(c => {
            if (c.type === 'paragraph') return getText(c.paragraph?.rich_text);
            if (c.type === 'bulleted_list_item') return getText(c.bulleted_list_item?.rich_text);
            return '';
          })
          .filter(t => t.trim());

        const level = color.includes('red') ? 'critical' : 'warning';

        // Skip if it's a "RESOURCES & REFERENCES" callout
        if (text.includes('RESOURCES & REFERENCES')) {
          i++; continue;
        }

        sections.push({
          blockType: 'safety',
          level,
          title: null,
          content: text,
          items: childTexts.map(t => ({ text: t })),
        });
        i++; continue;
      }

      // Duration callout (blue with ⏰)
      if (color.includes('blue') && icon === '⏰') {
        // Skip — duration is captured in teaching step
        i++; continue;
      }

      // Teaching sequence marker
      if (text === 'TEACHING SEQUENCE') {
        i++; continue;
      }

      // Other callouts → prose
      if (text.trim()) {
        sections.push({ blockType: 'prose', content: createLexical(text) });
      }
      i++; continue;
    }

    // ── TO-DO ITEMS → checklist ──
    if (type === 'to_do') {
      // Collect consecutive to-do items
      const items = [];
      let checklistTitle = 'Checklist';

      // Look back for a heading to use as title
      if (sections.length > 0) {
        const last = sections[sections.length - 1];
        if (last.blockType === 'heading') {
          checklistTitle = last.text;
          sections.pop(); // Remove the heading, it becomes the checklist title
        }
      }

      while (i < blocks.length && blocks[i].type === 'to_do') {
        items.push({
          text: getText(blocks[i].to_do.rich_text),
          quantity: null,
        });
        i++;
      }

      sections.push({
        blockType: 'checklist',
        title: checklistTitle,
        category: checklistTitle.toLowerCase().includes('material') ? 'materials' :
                  checklistTitle.toLowerCase().includes('tool') ? 'tools' :
                  checklistTitle.toLowerCase().includes('security') ? 'equipment' :
                  checklistTitle.toLowerCase().includes('pre-session') || checklistTitle.toLowerCase().includes('preparation') ? 'preparation' : 'materials',
        items,
      });
      continue;
    }

    // ── BULLETED LIST → collect into prose ──
    if (type === 'bulleted_list_item') {
      const items = [];
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        items.push(getText(blocks[i].bulleted_list_item.rich_text));
        i++;
      }
      sections.push({
        blockType: 'prose',
        content: createLexical(items.map(item => `• ${item}`).join('\n')),
      });
      continue;
    }

    // ── PARAGRAPH ──
    if (type === 'paragraph') {
      const text = getText(block.paragraph?.rich_text);

      // Skip "Toggle to view..." artifacts
      if (text.match(/^Toggle to view/i)) { i++; continue; }

      // Skip structural labels
      if (text === 'TEACHING SEQUENCE' || text === 'RESOURCES' || text === 'VIDEO' ||
          text === 'HANDOUT DOCUMENT') { i++; continue; }

      if (text.trim()) {
        sections.push({ blockType: 'prose', content: createLexical(text) });
      }
      i++; continue;
    }

    // ── QUOTE ──
    if (type === 'quote') {
      const text = getText(block.quote?.rich_text);
      const childTexts = (block._children || [])
        .map(c => c.type === 'paragraph' ? getText(c.paragraph?.rich_text) : '')
        .filter(t => t.trim());
      const fullText = [text, ...childTexts].filter(Boolean).join('\n');
      if (fullText.trim()) {
        sections.push({ blockType: 'prose', content: createLexical(`> ${fullText}`) });
      }
      i++; continue;
    }

    // ── FILE ──
    if (type === 'file') {
      const name = block.file?.name || '';
      const url = block.file?.file?.url || block.file?.external?.url || '';
      if (url) {
        sections.push({
          blockType: 'resource',
          resourceType: 'file',
          url,
          title: name || null,
          caption: null,
        });
      }
      i++; continue;
    }

    // ── VIDEO ──
    if (type === 'video') {
      const url = block.video?.file?.url || block.video?.external?.url || '';
      if (url) {
        sections.push({
          blockType: 'resource',
          resourceType: 'video',
          url,
          title: 'Video',
          caption: null,
        });
      }
      i++; continue;
    }

    // ── IMAGE ──
    if (type === 'image') {
      const url = block.image?.file?.url || block.image?.external?.url || '';
      if (url) {
        sections.push({
          blockType: 'resource',
          resourceType: 'image',
          url,
          title: null,
          caption: getText(block.image?.caption) || null,
        });
      }
      i++; continue;
    }

    // Skip unknown types
    i++;
  }

  return sections;
}

function createLexical(text) {
  const paragraphs = text.split('\n').filter(p => p.trim());
  return {
    root: {
      type: 'root',
      children: paragraphs.map(paragraph => ({
        type: 'paragraph',
        children: [{ type: 'text', text: paragraph.trim(), format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
        direction: 'ltr', format: '', indent: 0, version: 1,
      })),
      direction: 'ltr', format: '', indent: 0, version: 1,
    },
  };
}

// ─── Database update ─────────────────────────────────────────────────────────

async function clearLessonBlocks(lessonId) {
  const blockTables = [
    'lessons_blocks_heading', 'lessons_blocks_prose', 'lessons_blocks_safety',
    'lessons_blocks_safety_items', 'lessons_blocks_teaching_step',
    'lessons_blocks_teaching_step_activities', 'lessons_blocks_teaching_step_paragraphs',
    'lessons_blocks_teaching_step_tips', 'lessons_blocks_teaching_step_warnings',
    'lessons_blocks_teaching_step_resources', 'lessons_blocks_teaching_step_tables',
    'lessons_blocks_teaching_step_quotes',
    'lessons_blocks_checklist', 'lessons_blocks_checklist_items',
    'lessons_blocks_checkpoint', 'lessons_blocks_checkpoint_items',
    'lessons_blocks_timeline', 'lessons_blocks_timeline_rows',
    'lessons_blocks_outcomes', 'lessons_blocks_outcomes_items',
    'lessons_blocks_vocabulary', 'lessons_blocks_vocabulary_terms',
    'lessons_blocks_resource',
  ];

  // Delete in reverse order (children first)
  for (const table of blockTables.reverse()) {
    if (table.includes('_items') || table.includes('_activities') ||
        table.includes('_paragraphs') || table.includes('_tips') ||
        table.includes('_warnings') || table.includes('_resources') ||
        table.includes('_tables') || table.includes('_quotes') ||
        table.includes('_rows') || table.includes('_terms')) {
      // Child table — delete where parent is in this lesson
      const parentTable = table.replace(/_[^_]+$/, '');
      await pool.query(`DELETE FROM payload.${table} WHERE _parent_id IN (SELECT id FROM payload.${parentTable} WHERE _parent_id = $1)`, [lessonId]);
    } else {
      await pool.query(`DELETE FROM payload.${table} WHERE _parent_id = $1`, [lessonId]);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔄 Re-migrating Module 1 lessons with improved parsing');
  if (DRY_RUN) console.log('📋 DRY RUN — no database changes\n');

  for (const lesson of LESSONS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📄 ${lesson.title} (Payload ID: ${lesson.payloadId})`);
    console.log(`${'═'.repeat(60)}`);

    // Fetch from Notion
    console.log('  Fetching from Notion...');
    const blocks = await fetchBlocks(lesson.notionId);
    console.log(`  Found ${blocks.length} blocks`);

    // Convert to Payload sections
    const sections = convertBlocks(blocks);
    console.log(`  Parsed into ${sections.length} sections:`);

    // Count by type
    const counts = {};
    for (const s of sections) {
      counts[s.blockType] = (counts[s.blockType] || 0) + 1;
    }
    for (const [type, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${type}: ${count}`);
    }

    // Show preview
    console.log('\n  Section preview:');
    for (let j = 0; j < sections.length; j++) {
      const s = sections[j];
      let preview = '';
      switch (s.blockType) {
        case 'heading': preview = `[${s.level}] ${s.text}`; break;
        case 'prose': {
          const text = s.content?.root?.children?.[0]?.children?.[0]?.text || '';
          preview = text.substring(0, 60);
          break;
        }
        case 'teachingStep': preview = `Step ${s.stepNumber}: ${s.title || s.instruction?.substring(0, 40)}`; break;
        case 'safety': preview = `${s.level}: ${(s.content || '').substring(0, 40)}`; break;
        case 'checklist': preview = `${s.title} [${s.category}] (${s.items?.length || 0} items)`; break;
        case 'checkpoint': preview = `${s.title} (${s.items?.length || 0} criteria)`; break;
        case 'timeline': preview = `${s.title || 'schedule'} (${s.rows?.length || 0} rows)`; break;
        case 'vocabulary': preview = `${s.terms?.length || 0} terms`; break;
        case 'resource': preview = `${s.resourceType}: ${s.title || s.url?.substring(0, 40)}`; break;
        case 'outcomes': preview = `${s.title} (${s.items?.length || 0} items)`; break;
        default: preview = s.blockType;
      }
      console.log(`    ${j + 1}. [${s.blockType}] ${preview}`);
    }

    if (!DRY_RUN) {
      console.log('\n  Writing to database...');
      // This would need the Payload SDK to write blocks properly.
      // For now, just output the sections as JSON for manual import.
      console.log('  ⚠️  Database write requires Payload SDK — outputting JSON instead');
    }
  }

  console.log('\n✅ Analysis complete');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
