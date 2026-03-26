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
const { randomUUID } = require('crypto');
require('dotenv').config({ path: '.env.local' });

const WRITE = process.argv.includes('--write');
const USE_PROD = process.argv.includes('--production');
const LESSON_FILTER = process.argv.find(a => a.startsWith('--lesson='))?.split('=')[1];

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const dbUrl = USE_PROD
  ? 'postgresql://postgres.tlsucumnmaclyaycktrd:BambooPayload2026x@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
  : process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });

// All 12 lessons: Payload ID → Notion ID mapping
// Lessons 21-24 are module-level pages (the module IS the lesson)
const ALL_LESSONS = [
  // Module 1
  { payloadId: 13, notionId: '1a44c615-3ed9-80d7-a6af-caddc7006631', title: 'LESSON 1' },
  { payloadId: 14, notionId: '1a44c615-3ed9-8038-82db-e1650859d0ff', title: 'LESSON 2' },
  { payloadId: 15, notionId: '1a44c615-3ed9-80b0-959b-eec60da86c07', title: 'LESSON 3/4/5' },
  // Module 2 Unit 1
  { payloadId: 16, notionId: '1a54c615-3ed9-8029-8de7-fe022d5153ea', title: 'LESSON 6' },
  { payloadId: 17, notionId: '1a54c615-3ed9-80f5-9f6e-ef23380e4ee8', title: 'LESSON 7' },
  { payloadId: 18, notionId: '1a54c615-3ed9-80bc-9d02-d0fe521b1772', title: 'LESSON 8' },
  { payloadId: 19, notionId: '1a54c615-3ed9-8062-9e4c-dd106634e80f', title: 'LESSON 9' },
  { payloadId: 20, notionId: '1a54c615-3ed9-80cd-9434-e327f47f8e64', title: 'LESSON 10' },
  // Module 2 Units 2-5 (module page = lesson content)
  { payloadId: 21, notionId: '1b24c615-3ed9-80fb-9e0d-dae10405cca0', title: 'LESSON 11-15' },
  { payloadId: 22, notionId: '19f4c615-3ed9-8057-aa77-caad8718d577', title: 'LESSON 16-20' },
  { payloadId: 23, notionId: '19f4c615-3ed9-80d6-b6b3-cd1aa38b1074', title: 'LESSON 21-25' },
  { payloadId: 24, notionId: '19f4c615-3ed9-8075-865d-de852559a216', title: 'LESSON 26-30' },
];

const LESSONS = LESSON_FILTER
  ? ALL_LESSONS.filter(l => String(l.payloadId) === LESSON_FILTER)
  : ALL_LESSONS;

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

  if (depth < 5) {
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

      // Info/detail table detection: 2-column table with headers like "Item|Information" or "Detail|Info"
      if (headerLower.length === 2 &&
          (headerLower[0] === 'item' || headerLower[0] === 'detail' || headerLower[0] === 'element') &&
          (headerLower[1] === 'information' || headerLower[1] === 'info')) {
        const text = dataRows.filter(row => row[0]?.trim()).map(row => `**${row[0]}:** ${row[1] || ''}`).join('\n');
        sections.push({ blockType: 'prose', content: createLexical(text) });
        i++; continue;
      }

      // Checklist/materials detection: has item + quantity columns
      if (headerLower.includes('item') || headerLower.includes('items') ||
          headerLower.some(h => h.includes('material')) ||
          headerLower.some(h => h.includes('quantity'))) {
        // Include ALL columns in the text (not just first 2)
        sections.push({
          blockType: 'checklist',
          title: 'Materials & Equipment',
          category: 'materials',
          items: dataRows.map(row => ({
            text: row.filter(Boolean).join(' — ') || '',
            quantity: null,
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

          // Callout — check for duration, otherwise capture content
          if (bt === 'callout') {
            const calloutText = getText(b.callout?.rich_text);
            const durationMatch = calloutText.match(/(\d+)\s*minutes?/i);
            if (durationMatch) {
              duration = `${durationMatch[1]} min`;
            } else if (calloutText.trim() && calloutText !== 'TEACHING SEQUENCE') {
              paragraphs.push(calloutText);
            }
            // Capture callout children
            if (b._children) {
              for (const child of b._children) {
                const ct = child.type;
                if (child[ct]?.rich_text) {
                  const t = getText(child[ct].rich_text);
                  if (t.trim()) paragraphs.push(t);
                }
              }
            }
            i++; continue;
          }

          // Bullet items → activities (including nested children)
          if (bt === 'bulleted_list_item') {
            activities.push({ text: getText(b.bulleted_list_item.rich_text), duration: null });
            // Capture nested bullet/numbered children recursively
            function extractNestedItems(children) {
              for (const child of (children || [])) {
                const ct = child.type;
                if (child[ct]?.rich_text) {
                  const t = getText(child[ct].rich_text);
                  if (t.trim()) activities.push({ text: t, duration: null });
                }
                if (child._children) extractNestedItems(child._children);
              }
            }
            extractNestedItems(b._children);
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

          // Numbered list items inside teaching steps (with recursive children)
          if (bt === 'numbered_list_item') {
            const nText = getText(b.numbered_list_item?.rich_text);
            if (nText.trim()) activities.push({ text: nText, duration: null });
            // Recursively capture all nested children
            function extractNestedNumbered(children) {
              for (const child of (children || [])) {
                const ct = child.type;
                if (child[ct]?.rich_text) {
                  const t = getText(child[ct].rich_text);
                  if (t.trim()) activities.push({ text: t, duration: null });
                }
                if (child._children) extractNestedNumbered(child._children);
              }
            }
            extractNestedNumbered(b._children);
            i++; continue;
          }

          // Toggle blocks inside teaching steps — extract all content
          if (bt === 'toggle') {
            const toggleTitle = getText(b.toggle?.rich_text);
            if (toggleTitle.trim()) paragraphs.push(toggleTitle);
            function extractToggleContent(children) {
              for (const c of (children || [])) {
                const ct = c.type;
                if (c[ct]?.rich_text) {
                  const t = getText(c[ct].rich_text);
                  if (t.trim()) paragraphs.push(t);
                }
                if (ct === 'table_row' && c.table_row?.cells) {
                  const cellText = c.table_row.cells.map(cell => getText(cell)).filter(t => t.trim()).join(' | ');
                  if (cellText.trim()) paragraphs.push(cellText);
                }
                if (ct === 'table') {
                  for (const row of (c._children || [])) {
                    if (row.type === 'table_row' && row.table_row?.cells) {
                      const cellText = row.table_row.cells.map(cell => getText(cell)).filter(t => t.trim()).join(' | ');
                      if (cellText.trim()) paragraphs.push(cellText);
                    }
                  }
                }
                if (c._children) extractToggleContent(c._children);
              }
            }
            extractToggleContent(b._children);
            i++; continue;
          }

          // Tables inside teaching steps — extract all cell content
          if (bt === 'table') {
            const tableRows = (b._children || []).filter(c => c.type === 'table_row');
            for (const row of tableRows) {
              if (row.table_row?.cells) {
                const cellText = row.table_row.cells.map(cell => getText(cell)).filter(t => t.trim()).join(' | ');
                if (cellText.trim()) paragraphs.push(cellText);
              }
            }
            i++; continue;
          }

          // Table rows (standalone, outside table context)
          if (bt === 'table_row') {
            if (b.table_row?.cells) {
              const cellText = b.table_row.cells.map(cell => getText(cell)).filter(t => t.trim()).join(' | ');
              if (cellText.trim()) paragraphs.push(cellText);
            }
            i++; continue;
          }

          // Fallback: capture text from any unhandled block type inside section
          {
            let fallbackText = '';
            if (b[bt]?.rich_text) fallbackText = getText(b[bt].rich_text);
            // Also handle table cells in fallback
            if (bt === 'table_row' && b.table_row?.cells) {
              fallbackText = b.table_row.cells.map(cell => getText(cell)).filter(t => t.trim()).join(' | ');
            }
            if (fallbackText.trim()) paragraphs.push(fallbackText);
            // Also capture children recursively
            if (b._children) {
              function extractAllChildContent(children) {
                for (const child of (children || [])) {
                  const ct = child.type;
                  if (child[ct]?.rich_text) {
                    const t = getText(child[ct].rich_text);
                    if (t.trim()) paragraphs.push(t);
                  }
                  if (ct === 'table_row' && child.table_row?.cells) {
                    const cellText = child.table_row.cells.map(cell => getText(cell)).filter(t => t.trim()).join(' | ');
                    if (cellText.trim()) paragraphs.push(cellText);
                  }
                  if (child._children) extractAllChildContent(child._children);
                }
              }
              extractAllChildContent(b._children);
            }
          }
          i++;
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

    // ── TOGGLE — extract heading + all children as prose ──
    if (type === 'toggle') {
      const toggleTitle = getText(block.toggle?.rich_text);
      const childTexts = [];
      function extractChildren(children) {
        for (const c of (children || [])) {
          const ct = c.type;
          if (c[ct]?.rich_text) {
            const t = getText(c[ct].rich_text);
            if (t.trim()) childTexts.push(t.trim());
          }
          if (ct === 'table_row' && c.table_row?.cells) {
            childTexts.push(c.table_row.cells.map(cell => getText(cell)).join(' | '));
          }
          if (c._children) extractChildren(c._children);
        }
      }
      extractChildren(block._children);
      const allText = [toggleTitle, ...childTexts].filter(Boolean).join('\n');
      if (allText.trim()) {
        sections.push({ blockType: 'prose', content: createLexical(allText) });
      }
      i++; continue;
    }

    // ── NUMBERED LIST — collect consecutive items ──
    if (type === 'numbered_list_item') {
      const items = [];
      let num = 1;
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        const text = getText(blocks[i].numbered_list_item?.rich_text);
        if (text.trim()) items.push(`${num}. ${text}`);
        // Also capture children (nested lists)
        if (blocks[i]._children) {
          for (const child of blocks[i]._children) {
            const ct = child.type;
            if (child[ct]?.rich_text) {
              const t = getText(child[ct].rich_text);
              if (t.trim()) items.push(`   ${t}`);
            }
          }
        }
        num++;
        i++;
      }
      if (items.length) {
        sections.push({ blockType: 'prose', content: createLexical(items.join('\n')) });
      }
      continue;
    }

    // ── COLUMN LIST — extract text from all columns ──
    if (type === 'column_list') {
      const columnTexts = [];
      for (const col of (block._children || [])) {
        for (const c of (col._children || [])) {
          const ct = c.type;
          if (c[ct]?.rich_text) {
            const t = getText(c[ct].rich_text);
            if (t.trim()) columnTexts.push(t.trim());
          }
          if (c._children) {
            for (const gc of c._children) {
              const gct = gc.type;
              if (gc[gct]?.rich_text) {
                const t = getText(gc[gct].rich_text);
                if (t.trim()) columnTexts.push(t.trim());
              }
            }
          }
        }
      }
      if (columnTexts.length) {
        sections.push({ blockType: 'prose', content: createLexical(columnTexts.join('\n')) });
      }
      i++; continue;
    }

    // ── RAW FALLBACK — capture any unrecognized block type as prose ──
    {
      let text = '';
      if (block[type]?.rich_text) {
        text = getText(block[type].rich_text);
      }
      // Also capture child text
      const childTexts = [];
      function extractAll(children) {
        for (const c of (children || [])) {
          const ct = c.type;
          if (c[ct]?.rich_text) {
            const t = getText(c[ct].rich_text);
            if (t.trim()) childTexts.push(t.trim());
          }
          if (c._children) extractAll(c._children);
        }
      }
      extractAll(block._children);
      const fullText = [text, ...childTexts].filter(Boolean).join('\n');
      if (fullText.trim()) {
        console.warn(`  ⚠ Fallback prose for block type "${type}": ${fullText.substring(0, 60)}...`);
        sections.push({ blockType: 'prose', content: createLexical(fullText) });
      }
    }
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

// ─── Database write helpers ──────────────────────────────────────────────────

function uid() { return randomUUID(); }

async function ins(table, data) {
  const id = uid();
  const cols = ['id', ...Object.keys(data)];
  const vals = [id, ...Object.values(data)];
  const placeholders = vals.map((_, i) => `$${i + 1}`);
  await pool.query(
    `INSERT INTO payload.${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
    vals
  );
  return id;
}

async function writeSectionsToDB(lessonId, sections) {
  await clearLessonBlocks(lessonId);

  for (let order = 0; order < sections.length; order++) {
    const s = sections[order];
    const blockName = `${s.blockType}-${order}`;

    switch (s.blockType) {
      case 'heading':
        await ins('lessons_blocks_heading', { _parent_id: lessonId, _order: order, _path: 'sections', level: s.level, text: s.text, block_name: blockName });
        break;

      case 'prose':
        await ins('lessons_blocks_prose', { _parent_id: lessonId, _order: order, _path: 'sections', content: JSON.stringify(s.content), block_name: blockName });
        break;

      case 'timeline': {
        const tlId = await ins('lessons_blocks_timeline', { _parent_id: lessonId, _order: order, _path: 'sections', title: s.title, block_name: blockName });
        for (let ri = 0; ri < (s.rows || []).length; ri++) {
          const r = s.rows[ri];
          await ins('lessons_blocks_timeline_rows', { _parent_id: tlId, _order: ri, time: r.time, activity: r.activity, duration: r.duration, notes: r.notes });
        }
        break;
      }
      case 'checklist': {
        const clId = await ins('lessons_blocks_checklist', { _parent_id: lessonId, _order: order, _path: 'sections', title: s.title, category: s.category, block_name: blockName });
        for (let ii = 0; ii < (s.items || []).length; ii++) {
          await ins('lessons_blocks_checklist_items', { _parent_id: clId, _order: ii, text: s.items[ii].text, quantity: s.items[ii].quantity });
        }
        break;
      }
      case 'safety': {
        const sfId = await ins('lessons_blocks_safety', { _parent_id: lessonId, _order: order, _path: 'sections', level: s.level, title: s.title, content: s.content, block_name: blockName });
        for (let ii = 0; ii < (s.items || []).length; ii++) {
          await ins('lessons_blocks_safety_items', { _parent_id: sfId, _order: ii, text: s.items[ii].text });
        }
        break;
      }
      case 'teachingStep': {
        const tsId = await ins('lessons_blocks_teaching_step', {
          _parent_id: lessonId, _order: order, _path: 'sections',
          step_number: s.stepNumber, title: s.title, instruction: s.instruction,
          duration: s.duration, teaching_approach: s.teachingApproach, differentiation: s.differentiation,
          block_name: blockName,
        });
        for (let ai = 0; ai < (s.activities || []).length; ai++)
          await ins('lessons_blocks_teaching_step_activities', { _parent_id: tsId, _order: ai, text: s.activities[ai].text, duration: s.activities[ai].duration });
        for (let pi = 0; pi < (s.paragraphs || []).length; pi++)
          await ins('lessons_blocks_teaching_step_paragraphs', { _parent_id: tsId, _order: pi, text: s.paragraphs[pi].text || s.paragraphs[pi] });
        for (let ti = 0; ti < (s.tips || []).length; ti++)
          await ins('lessons_blocks_teaching_step_tips', { _parent_id: tsId, _order: ti, text: s.tips[ti].text || s.tips[ti] });
        for (let wi = 0; wi < (s.warnings || []).length; wi++)
          await ins('lessons_blocks_teaching_step_warnings', { _parent_id: tsId, _order: wi, text: s.warnings[wi].text || s.warnings[wi] });
        for (let qi = 0; qi < (s.quotes || []).length; qi++)
          await ins('lessons_blocks_teaching_step_quotes', { _parent_id: tsId, _order: qi, text: s.quotes[qi].text || s.quotes[qi] });
        break;
      }
      case 'checkpoint': {
        const cpId = await ins('lessons_blocks_checkpoint', { _parent_id: lessonId, _order: order, _path: 'sections', title: s.title, block_name: blockName });
        for (let ci = 0; ci < (s.items || []).length; ci++)
          await ins('lessons_blocks_checkpoint_items', { _parent_id: cpId, _order: ci, criterion: s.items[ci].criterion, description: s.items[ci].description });
        break;
      }
      case 'outcomes': {
        const oId = await ins('lessons_blocks_outcomes', { _parent_id: lessonId, _order: order, _path: 'sections', title: s.title, block_name: blockName });
        for (let oi = 0; oi < (s.items || []).length; oi++)
          await ins('lessons_blocks_outcomes_items', { _parent_id: oId, _order: oi, text: s.items[oi] });
        break;
      }
      case 'vocabulary': {
        const vId = await ins('lessons_blocks_vocabulary', { _parent_id: lessonId, _order: order, _path: 'sections', block_name: blockName });
        for (let vi = 0; vi < (s.terms || []).length; vi++)
          await ins('lessons_blocks_vocabulary_terms', { _parent_id: vId, _order: vi, term: s.terms[vi].term, definition: s.terms[vi].definition });
        break;
      }
      case 'resource':
        await ins('lessons_blocks_resource', { _parent_id: lessonId, _order: order, _path: 'sections', resource_type: s.resourceType, url: s.url, title: s.title, caption: s.caption, block_name: blockName });
        break;
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄 Re-migrating ${LESSONS.length} lesson(s) with improved parsing`);
  console.log(`   Database: ${USE_PROD ? 'PRODUCTION' : 'LOCAL'}`);
  console.log(`   Mode: ${WRITE ? 'WRITE (will modify DB)' : 'DRY RUN (preview only)'}\n`);

  let totalBefore = 0, totalAfter = 0;

  for (const lesson of LESSONS) {
    console.log(`${'═'.repeat(60)}`);
    console.log(`📄 ${lesson.title} (Payload ID: ${lesson.payloadId})`);
    console.log(`${'═'.repeat(60)}`);

    // Count existing blocks
    const beforeRes = await pool.query(`
      SELECT
        (SELECT count(*) FROM payload.lessons_blocks_heading WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_prose WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_safety WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_teaching_step WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_checklist WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_checkpoint WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_timeline WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_outcomes WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_vocabulary WHERE _parent_id = $1) +
        (SELECT count(*) FROM payload.lessons_blocks_resource WHERE _parent_id = $1) as total
    `, [lesson.payloadId]);
    const blocksBefore = parseInt(beforeRes.rows[0].total);

    // Fetch from Notion
    console.log('  Fetching from Notion...');
    const blocks = await fetchBlocks(lesson.notionId);
    console.log(`  Notion blocks: ${blocks.length}`);

    // Convert to Payload sections
    const sections = convertBlocks(blocks);
    console.log(`  Parsed into: ${sections.length} sections (was ${blocksBefore} blocks in DB)`);

    // Count by type
    const counts = {};
    for (const s of sections) {
      counts[s.blockType] = (counts[s.blockType] || 0) + 1;
    }
    const typeStr = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}:${c}`).join(', ');
    console.log(`  Types: ${typeStr}`);

    totalBefore += blocksBefore;
    totalAfter += sections.length;

    if (WRITE) {
      console.log('  Writing to database...');
      await writeSectionsToDB(lesson.payloadId, sections);
      console.log(`  ✅ Written ${sections.length} sections`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 Summary: ${totalBefore} blocks before → ${totalAfter} sections after`);
  console.log(`   ${WRITE ? 'All changes committed to DB' : 'DRY RUN — no changes made'}`);
  if (USE_PROD) console.log('   ⚠️  Changes were made to PRODUCTION database');
  console.log('');

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
