/**
 * Notion → Payload CMS Migration via REST API
 *
 * Self-contained migration script that:
 * 1. Fetches content from Notion API
 * 2. Transforms Notion blocks → Payload block format
 * 3. Creates records via Payload REST API (requires dev server running)
 *
 * Run: node scripts/migrate-to-payload-rest.js
 * Requires: Dev server running on localhost:3000
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
});

const PAYLOAD_URL = 'http://localhost:3000/api/payload';
const DRY_RUN = process.argv.includes('--dry-run');
let PAYLOAD_TOKEN = '';

// Get Payload auth token
async function getPayloadToken() {
  const response = await fetch(`${PAYLOAD_URL}/payload-users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bamboo.local', password: 'migration-temp-pwd-2024' }),
  });
  if (!response.ok) throw new Error('Failed to authenticate with Payload');
  const data = await response.json();
  return data.token;
}

// Course config with Notion IDs
const COURSES = [
  {
    slug: 'workshop-skills',
    title: '6 Week Workshop Skills',
    shortTitle: 'Workshop Skills',
    description: 'Master essential bamboo bicycle building techniques through hands-on workshop sessions.',
    icon: 'wrench',
    color: 'green',
    duration: '6 weeks',
    level: 'Level 1-3',
    accreditation: 'OCN',
    enabled: true,
    isHandbook: false,
    notionNavId: env.NOTION_COURSE_NAV_ID,
    notionApiKey: env.NOTION_API_KEY,
  },
  {
    slug: 'flax-manual-handbook',
    title: 'Flax Manual Handbook',
    shortTitle: 'Flax Manual',
    description: 'Complete assembly and build guide for the Flax bamboo bicycle frame kit.',
    icon: 'book',
    color: 'teal',
    duration: 'Reference',
    level: 'All Levels',
    enabled: true,
    isHandbook: true,
    notionNavId: env.NOTION_FLAX_HANDBOOK_ID,
    notionApiKey: env.NOTION_MANUALS_API_KEY,
  },
];

const stats = { courses: 0, modules: 0, lessons: 0, handbooks: 0, errors: 0 };

// ---------------------------------------------------------------------------
// Notion helpers
// ---------------------------------------------------------------------------

function createNotionClient(apiKey) {
  return new Client({ auth: apiKey, timeoutMs: 30000 });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchNotionBlocks(client, blockId, depth = 0) {
  const blocks = [];
  let cursor = undefined;

  do {
    await sleep(150);
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results) {
      blocks.push(block);
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  // Recursively fetch children (max depth 3)
  if (depth <= 3) {
    for (const block of blocks) {
      if (block.has_children) {
        try {
          block.children = await fetchNotionBlocks(client, block.id, depth + 1);
        } catch (e) {
          console.warn(`    ⚠ Failed to fetch children for ${block.id}`);
          block.children = [];
        }
      }
    }
  }

  return blocks;
}

async function fetchNotionPage(client, pageId) {
  const response = await client.pages.retrieve({ page_id: pageId });
  let title = 'Untitled';
  const props = response.properties;
  if (props?.title?.title?.[0]?.plain_text) title = props.title.title[0].plain_text;
  else if (props?.Name?.title?.[0]?.plain_text) title = props.Name.title[0].plain_text;

  let icon = undefined;
  if (response.icon?.type === 'emoji') icon = response.icon.emoji;

  return { id: response.id, title, icon, properties: props };
}

async function fetchTopLevelBlocks(client, blockId) {
  // Non-recursive: only fetch direct children, no sub-block traversal
  const blocks = [];
  let cursor = undefined;
  do {
    await sleep(150);
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results) {
      blocks.push(block);
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function fetchChildPages(client, parentId) {
  const blocks = await fetchTopLevelBlocks(client, parentId);
  const pages = [];

  for (const block of blocks) {
    if (block.type === 'child_page' && block.child_page) {
      pages.push({ id: block.id, title: block.child_page.title });
    } else if (block.type === 'link_to_page' && block.link_to_page) {
      try {
        const page = await fetchNotionPage(client, block.link_to_page.page_id);
        pages.push({ id: page.id, title: page.title, icon: page.icon });
      } catch (e) {
        console.warn(`    ⚠ Failed to fetch linked page`);
      }
    }
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Text extraction from Notion blocks
// ---------------------------------------------------------------------------

function extractRichText(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => t.plain_text || '').join('');
}

function getBlockText(block) {
  const content = block[block.type];
  if (!content) return '';
  if (content.rich_text) return extractRichText(content.rich_text);
  return '';
}

// ---------------------------------------------------------------------------
// Notion blocks → Payload blocks conversion
// ---------------------------------------------------------------------------

function notionBlocksToPayloadBlocks(blocks) {
  const payloadBlocks = [];
  let i = 0;
  let proseBuffer = [];
  let stepCounter = 0;

  function flushProse() {
    if (proseBuffer.length > 0) {
      payloadBlocks.push({
        blockType: 'prose',
        content: createLexical(proseBuffer.join('\n\n')),
      });
      proseBuffer = [];
    }
  }

  while (i < blocks.length) {
    const block = blocks[i];

    // Headings
    if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
      const text = getBlockText(block);
      if (!text.trim()) { i++; continue; } // Skip headings with empty text
      const level = block.type === 'heading_1' ? '1' : block.type === 'heading_2' ? '2' : '3';

      // Check for SECTION pattern (teaching steps)
      const sectionMatch = text.match(/^(?:SECTION|Section|Step)\s*(\d+)\s*[:\-–—]\s*(.*)/i);
      if (sectionMatch) {
        flushProse();
        stepCounter++;
        const sectionContent = collectTeachingStepContent(blocks, i + 1);

        payloadBlocks.push({
          blockType: 'teachingStep',
          stepNumber: parseInt(sectionMatch[1]) || stepCounter,
          title: sectionMatch[2].trim() || text,
          instruction: sectionContent.instruction || sectionMatch[2].trim() || text,
          duration: sectionContent.duration || null,
          tips: sectionContent.tips.length > 0 ? sectionContent.tips.map(t => ({ text: t })) : [],
          warnings: sectionContent.warnings.length > 0 ? sectionContent.warnings.map(t => ({ text: t })) : [],
          paragraphs: sectionContent.paragraphs.length > 0 ? sectionContent.paragraphs.map(t => ({ text: t })) : [],
          activities: sectionContent.activities.length > 0 ? sectionContent.activities : [],
          resources: [],
          tables: [],
          quotes: sectionContent.quotes.length > 0 ? sectionContent.quotes.map(t => ({ text: t })) : [],
        });

        i = sectionContent.endIndex;
        continue;
      }

      // Check for checklist/outcomes heading
      const lowerText = text.toLowerCase();
      if (isChecklistHeading(lowerText)) {
        flushProse();
        let items = collectListItems(blocks, i + 1);
        // If no list items found, check for a table
        if (items.items.length === 0) {
          items = collectTableItems(blocks, i + 1);
        }
        if (items.items.length > 0) {
          payloadBlocks.push({
            blockType: 'checklist',
            title: text,
            category: getChecklistCategory(lowerText),
            items: items.items.map(item => {
              const qMatch = item.match(/^(.+?)\s*\((\d+[x×]?|[\d.]+\s*(?:ml|g|kg|m|cm|mm|rolls?|sheets?|pieces?))\s*\)$/i);
              if (qMatch) return { text: qMatch[1].trim(), quantity: qMatch[2] };
              return { text: item };
            }),
          });
        }
        i = items.endIndex;
        continue;
      }

      if (isOutcomesHeading(lowerText)) {
        flushProse();
        let items = collectListItems(blocks, i + 1);
        if (items.items.length === 0) {
          items = collectTableItems(blocks, i + 1);
        }
        if (items.items.length > 0) {
          payloadBlocks.push({
            blockType: 'outcomes',
            title: text,
            items: items.items.map(t => ({ text: t })),
          });
        }
        i = items.endIndex;
        continue;
      }

      if (isCheckpointHeading(lowerText)) {
        flushProse();
        let items = collectListItems(blocks, i + 1);
        if (items.items.length === 0) {
          items = collectTableItems(blocks, i + 1);
        }
        if (items.items.length > 0) {
          payloadBlocks.push({
            blockType: 'checkpoint',
            title: text,
            items: items.items.map(t => ({ criterion: t })),
          });
        }
        i = items.endIndex;
        continue;
      }

      // Regular heading
      flushProse();
      payloadBlocks.push({
        blockType: 'heading',
        level,
        text,
      });
      i++;
      continue;
    }

    // Callouts → Safety blocks
    if (block.type === 'callout' && block.callout) {
      const text = extractRichText(block.callout.rich_text);
      const color = block.callout.color || '';
      const isSafetyColor = color.includes('red') || color.includes('yellow') || color.includes('orange');
      const hasSafetyKeywords = /safety|danger|warning|caution|critical|ppe|protect|hazard/i.test(text);

      if (isSafetyColor || hasSafetyKeywords) {
        flushProse();
        let level = 'warning';
        if (color.includes('red')) level = 'critical';
        else if (color.includes('green') || color.includes('blue')) level = 'caution';

        let title = null;
        let content = text;
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 50) {
          title = text.substring(0, colonIdx).trim();
          content = text.substring(colonIdx + 1).trim();
        }

        const items = [];
        if (block.children) {
          for (const child of block.children) {
            const childText = getBlockText(child);
            if (childText) items.push({ text: childText });
          }
        }

        payloadBlocks.push({
          blockType: 'safety',
          level,
          title,
          content,
          items: items.length > 0 ? items : [],
        });
        i++;
        continue;
      }

      // Non-safety callout → check for structured content, then recurse into children
      flushProse();
      const lowerCalloutText = text.toLowerCase();

      // Check if callout heading matches structured patterns
      if (isOutcomesHeading(lowerCalloutText) && block.children && block.children.length > 0) {
        const items = [];
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText && childText.trim()) items.push({ text: childText.trim() });
        }
        if (items.length > 0) {
          payloadBlocks.push({ blockType: 'outcomes', title: text, items });
        }
        i++;
        continue;
      }

      if (isChecklistHeading(lowerCalloutText) && block.children && block.children.length > 0) {
        const items = [];
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText && childText.trim()) items.push({ text: childText.trim() });
        }
        if (items.length > 0) {
          payloadBlocks.push({
            blockType: 'checklist',
            title: text,
            category: getChecklistCategory(lowerCalloutText),
            items,
          });
        }
        i++;
        continue;
      }

      // Generic non-safety callout: push main text, then recursively process children
      if (text.trim()) proseBuffer.push(text);
      if (block.children && block.children.length > 0) {
        flushProse();
        const childBlocks = notionBlocksToPayloadBlocks(block.children);
        payloadBlocks.push(...childBlocks);
      }
      i++;
      continue;
    }

    // Tables → Timeline, Vocabulary, or data tables
    if (block.type === 'table' && block.children) {
      flushProse();
      const rows = block.children.filter(c => c.type === 'table_row');
      if (rows.length > 0) {
        const headerCells = rows[0].table_row.cells.map(cell => extractRichText(cell));
        // Strip HTML tags from headers (some Notion tables have <strong> etc.)
        const headerClean = headerCells.map(h => h.replace(/<[^>]+>/g, '').trim());
        const headerLower = headerClean.map(h => h.toLowerCase());

        // Timeline detection
        if (headerLower.some(h => h.includes('time')) && headerLower.some(h => h.includes('activity') || h.includes('task'))) {
          const timeIdx = headerLower.findIndex(h => h.includes('time'));
          const actIdx = headerLower.findIndex(h => h.includes('activity') || h.includes('task'));
          const durIdx = headerLower.findIndex(h => h.includes('duration') || h.includes('length'));

          // Collect ALL remaining columns as notes (captures Format, Materials, Resources, etc.)
          const usedIndices = new Set([timeIdx, actIdx]);
          if (durIdx >= 0) usedIndices.add(durIdx);
          const extraIndices = headerLower.map((_, idx) => idx).filter(idx => !usedIndices.has(idx));

          payloadBlocks.push({
            blockType: 'timeline',
            title: 'Lesson Schedule',
            rows: rows.slice(1).map(row => {
              const cells = row.table_row.cells.map(cell => extractRichText(cell));
              // Combine all extra columns into notes
              const extraParts = extraIndices
                .map(idx => {
                  const val = cells[idx]?.trim();
                  if (val) return `${headerClean[idx]}: ${val}`;
                  return '';
                })
                .filter(Boolean);

              return {
                time: cells[timeIdx] || '-',
                activity: cells[actIdx] || '-',
                duration: (durIdx >= 0 ? cells[durIdx] : '') || '-',
                notes: extraParts.length > 0 ? extraParts.join('; ') : null,
              };
            }),
          });
          i++;
          continue;
        }

        // Vocabulary detection — ONLY by explicit header matching (no 2-column heuristic)
        if (headerLower.some(h => h.includes('term') || h.includes('word') || h.includes('vocabulary') || h.includes('concept')) &&
            headerLower.some(h => h.includes('definition') || h.includes('meaning') || h.includes('description') || h.includes('explanation'))) {
          const termIdx = headerLower.findIndex(h => h.includes('term') || h.includes('word') || h.includes('vocabulary') || h.includes('concept'));
          const defIdx = headerLower.findIndex(h => h.includes('definition') || h.includes('meaning') || h.includes('description') || h.includes('explanation'));

          // Collect extra columns (like "Simple Example") into definition
          const extraDefIndices = headerLower.map((_, idx) => idx).filter(idx => idx !== termIdx && idx !== defIdx);

          payloadBlocks.push({
            blockType: 'vocabulary',
            terms: rows.slice(1)
              .map(row => {
                const cells = row.table_row.cells.map(cell => extractRichText(cell));
                const extraParts = extraDefIndices.map(idx => cells[idx]?.trim()).filter(Boolean);
                const fullDef = [cells[defIdx] || '', ...extraParts].filter(Boolean).join(' — ');
                return {
                  term: cells[termIdx] || '-',
                  definition: fullDef || '-',
                };
              })
              .filter(t => t.term.trim() && t.term !== '-'),
          });
          i++;
          continue;
        }

        // Check if it looks like a checklist/outcomes table
        if (headerLower.some(h => h.includes('outcome') || h.includes('objective') || h.includes('learning'))) {
          const items = rows.slice(1).map(row => {
            const cells = row.table_row.cells.map(cell => extractRichText(cell));
            return { text: cells.filter(c => c.trim()).join(' — ') };
          }).filter(item => item.text.trim());
          if (items.length > 0) {
            payloadBlocks.push({
              blockType: 'outcomes',
              title: headerCells.join(' / '),
              items,
            });
            i++;
            continue;
          }
        }

        // Generic table → prose representation (capture ALL content including headers)
        const tableLines = [];
        tableLines.push(headerClean.join(' | '));
        for (const row of rows.slice(1)) {
          const cells = row.table_row.cells.map(cell => extractRichText(cell));
          const line = cells.filter(c => c.trim()).join(' | ');
          if (line.trim()) tableLines.push(line);
        }
        proseBuffer.push(tableLines.join('\n'));
      }
      i++;
      continue;
    }

    // Paragraphs → Prose
    if (block.type === 'paragraph') {
      const text = getBlockText(block);
      if (text.trim()) proseBuffer.push(text);
      i++;
      continue;
    }

    // Lists → collect as prose or detect patterns (including nested children)
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const text = getBlockText(block);
      proseBuffer.push('• ' + text);
      // Extract nested children (sub-items within list items)
      if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText && childText.trim()) {
            proseBuffer.push('  • ' + childText);
          }
          // Handle grandchildren (3 levels deep)
          if (child.children && child.children.length > 0) {
            for (const gc of child.children) {
              const gcText = getBlockText(gc);
              if (gcText && gcText.trim()) {
                proseBuffer.push('    • ' + gcText);
              }
            }
          }
        }
      }
      i++;
      continue;
    }

    // Quotes
    if (block.type === 'quote') {
      const text = getBlockText(block);
      proseBuffer.push('> ' + text);
      i++;
      continue;
    }

    // Toggle blocks — recursively process children as proper blocks
    if (block.type === 'toggle') {
      const text = getBlockText(block);
      if (text.trim()) {
        flushProse();
        // Check if toggle heading matches structured content patterns
        const lowerText = text.toLowerCase();
        if (isChecklistHeading(lowerText) && block.children) {
          const items = [];
          for (const child of block.children) {
            const childText = getBlockText(child);
            if (childText) {
              const qMatch = childText.match(/^(.+?)\s*\((\d+[x×]?|[\d.]+\s*(?:ml|g|kg|m|cm|mm|rolls?|sheets?|pieces?))\s*\)$/i);
              if (qMatch) items.push({ text: qMatch[1].trim(), quantity: qMatch[2] });
              else items.push({ text: childText });
            }
          }
          if (items.length > 0) {
            payloadBlocks.push({
              blockType: 'checklist',
              title: text,
              category: getChecklistCategory(lowerText),
              items,
            });
          }
          i++;
          continue;
        }
        if (isOutcomesHeading(lowerText) && block.children) {
          const items = [];
          for (const child of block.children) {
            const childText = getBlockText(child);
            if (childText) items.push({ text: childText });
          }
          if (items.length > 0) {
            payloadBlocks.push({
              blockType: 'outcomes',
              title: text,
              items,
            });
          }
          i++;
          continue;
        }
        if (isCheckpointHeading(lowerText) && block.children) {
          const items = [];
          for (const child of block.children) {
            const childText = getBlockText(child);
            if (childText) items.push({ criterion: childText });
          }
          if (items.length > 0) {
            payloadBlocks.push({
              blockType: 'checkpoint',
              title: text,
              items,
            });
          }
          i++;
          continue;
        }
        // Generic toggle: add heading then recursively process children
        proseBuffer.push(text);
      }
      if (block.children && block.children.length > 0) {
        // Recursively convert toggle children to payload blocks
        const childBlocks = notionBlocksToPayloadBlocks(block.children);
        flushProse();
        payloadBlocks.push(...childBlocks);
      }
      i++;
      continue;
    }

    // To-do items
    if (block.type === 'to_do') {
      const text = getBlockText(block);
      const checked = block.to_do?.checked ? '☑' : '☐';
      proseBuffer.push(`${checked} ${text}`);
      i++;
      continue;
    }

    // Images → Resource
    if (block.type === 'image') {
      flushProse();
      const url = block.image?.external?.url || block.image?.file?.url || '';
      const caption = block.image?.caption ? extractRichText(block.image.caption) : '';
      if (url) {
        payloadBlocks.push({
          blockType: 'resource',
          resourceType: 'image',
          url,
          title: caption || 'Image',
          caption: caption || null,
        });
      }
      i++;
      continue;
    }

    // Video → Resource
    if (block.type === 'video') {
      flushProse();
      const url = block.video?.external?.url || block.video?.file?.url || '';
      if (url) {
        payloadBlocks.push({
          blockType: 'resource',
          resourceType: 'video',
          url,
          title: 'Video',
        });
      }
      i++;
      continue;
    }

    // PDF/File → Resource
    if (block.type === 'pdf' || block.type === 'file') {
      flushProse();
      const content = block[block.type];
      const url = content?.external?.url || content?.file?.url || '';
      if (url) {
        payloadBlocks.push({
          blockType: 'resource',
          resourceType: block.type === 'pdf' ? 'pdf' : 'file',
          url,
          title: content?.name || block.type.toUpperCase(),
        });
      }
      i++;
      continue;
    }

    // Embed/Bookmark → Resource
    if (block.type === 'embed' || block.type === 'bookmark') {
      flushProse();
      const content = block[block.type];
      const url = content?.url || '';
      if (url) {
        payloadBlocks.push({
          blockType: 'resource',
          resourceType: 'file',
          url,
          title: 'Embedded Resource',
        });
      }
      i++;
      continue;
    }

    // Divider → flush prose
    if (block.type === 'divider') {
      flushProse();
      i++;
      continue;
    }

    // Column list → process children
    if (block.type === 'column_list' && block.children) {
      for (const column of block.children) {
        if (column.children) {
          const childBlocks = notionBlocksToPayloadBlocks(column.children);
          payloadBlocks.push(...childBlocks);
        }
      }
      i++;
      continue;
    }

    // Code block → prose
    if (block.type === 'code') {
      const text = getBlockText(block);
      if (text) proseBuffer.push('```\n' + text + '\n```');
      i++;
      continue;
    }

    // Skip child_page, link_to_page, child_database
    if (block.type === 'child_page' || block.type === 'link_to_page' || block.type === 'child_database') {
      i++;
      continue;
    }

    // Fallback: skip unknown types
    console.log(`      ⚠ Skipping unknown block type: ${block.type}`);
    i++;
  }

  flushProse();

  // Post-process: validate and fix blocks
  return payloadBlocks.filter(block => {
    // Filter out blocks with empty required arrays
    if (block.blockType === 'checklist' && (!block.items || block.items.length === 0)) return false;
    if (block.blockType === 'checkpoint' && (!block.items || block.items.length === 0)) return false;
    if (block.blockType === 'outcomes' && (!block.items || block.items.length === 0)) return false;
    if (block.blockType === 'vocabulary' && (!block.terms || block.terms.length === 0)) return false;
    if (block.blockType === 'timeline' && (!block.rows || block.rows.length === 0)) return false;
    // Filter out headings with empty text
    if (block.blockType === 'heading' && (!block.text || !block.text.trim())) return false;
    // Filter out teaching steps with empty instruction
    if (block.blockType === 'teachingStep' && (!block.instruction || !block.instruction.trim())) return false;
    // Ensure timeline rows have all required fields
    if (block.blockType === 'timeline') {
      block.rows = block.rows
        .filter(r => (r.time && r.time.trim()) || (r.activity && r.activity.trim()))
        .map(r => ({
          ...r,
          time: r.time || '-',
          activity: r.activity || '-',
          duration: r.duration || '-',
        }));
      if (block.rows.length === 0) return false;
    }
    // Ensure checklist items have text
    if (block.blockType === 'checklist') {
      block.items = block.items.filter(item => item.text && item.text.trim());
      if (block.items.length === 0) return false;
    }
    // Ensure checkpoint items have criterion
    if (block.blockType === 'checkpoint') {
      block.items = block.items.filter(item => item.criterion && item.criterion.trim());
      if (block.items.length === 0) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Helpers for structured content detection
// ---------------------------------------------------------------------------

function isChecklistHeading(text) {
  return /material|tool|equipment|preparation|what you.ll need|required|supplies|checklist/i.test(text);
}

function isOutcomesHeading(text) {
  return /learning outcome|objective|by the end|you will|aim|goal/i.test(text);
}

function isCheckpointHeading(text) {
  return /checkpoint|quality check|assessment|criteria|evaluation/i.test(text);
}

function getChecklistCategory(text) {
  if (/tool/i.test(text)) return 'tools';
  if (/equipment/i.test(text)) return 'equipment';
  if (/preparation|prep/i.test(text)) return 'preparation';
  return 'materials';
}

function collectListItems(blocks, startIdx) {
  const items = [];
  let i = startIdx;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item' || block.type === 'to_do') {
      const text = getBlockText(block);
      if (text.trim()) items.push(text);
      // Also collect nested children
      if (block.children) {
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText.trim()) items.push(childText);
        }
      }
      i++;
    } else if (block.type === 'toggle') {
      // Toggle blocks can be used as list items (e.g., outcomes with expandable sub-items)
      const text = getBlockText(block);
      if (text.trim()) items.push(text);
      if (block.children) {
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText.trim()) items.push(childText);
        }
      }
      i++;
    } else if (block.type === 'paragraph') {
      // Also collect paragraphs that look like list items (▶, •, -, ●, etc.)
      const text = getBlockText(block);
      if (text.match(/^[▶•●○◆◇★☆►→\-–—]\s*/)) {
        items.push(text.replace(/^[▶•●○◆◇★☆►→\-–—]\s*/, '').trim());
        i++;
      } else if (items.length > 0 && text.trim()) {
        // Continue collecting if we already have items and this is a non-empty paragraph
        items.push(text.trim());
        i++;
      } else if (items.length === 0 && text.trim()) {
        // Skip "connector" paragraphs (e.g., "By the end of this session, students will be able to:")
        // when the NEXT block is a collectable item
        const next = blocks[i + 1];
        if (next && (next.type === 'bulleted_list_item' || next.type === 'numbered_list_item' ||
            next.type === 'to_do' || next.type === 'toggle' ||
            (next.type === 'paragraph' && getBlockText(next).match(/^[▶•●○◆◇★☆►→\-–—]\s*/)))) {
          i++; // Skip connector paragraph, continue to actual items
        } else {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return { items, endIndex: i };
}

// Extract items from a table (for checklists, outcomes, etc. that use tables)
function collectTableItems(blocks, startIdx) {
  if (startIdx >= blocks.length) return { items: [], endIndex: startIdx };
  const block = blocks[startIdx];
  if (block.type !== 'table' || !block.children) return { items: [], endIndex: startIdx };

  const rows = block.children.filter(c => c.type === 'table_row');
  const items = [];
  // Skip first row if it looks like a header
  const startRow = rows.length > 1 ? 1 : 0;
  for (let ri = startRow; ri < rows.length; ri++) {
    const cells = rows[ri].table_row.cells.map(cell => extractRichText(cell));
    const text = cells.filter(c => c.trim()).join(' — ');
    if (text.trim()) items.push(text);
  }
  return { items, endIndex: startIdx + 1 };
}

function collectTeachingStepContent(blocks, startIdx) {
  const result = {
    instruction: '',
    duration: null,
    tips: [],
    warnings: [],
    activities: [],
    paragraphs: [],
    quotes: [],
    endIndex: startIdx,
  };

  let i = startIdx;
  let instructionSet = false;

  while (i < blocks.length) {
    const block = blocks[i];

    // Stop at next heading or section pattern
    if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
      const text = getBlockText(block);
      if (/^(?:SECTION|Section|Step)\s*\d+/i.test(text)) break;
      // Sub-headings within a section
      result.paragraphs.push('**' + text + '**');
      i++;
      continue;
    }

    if (block.type === 'paragraph') {
      const text = getBlockText(block);
      if (!text.trim()) { i++; continue; }

      // Duration detection
      const durMatch = text.match(/(\d+\s*(?:min|minute|hour|hr)s?)/i);
      if (durMatch && !result.duration) {
        result.duration = durMatch[1];
      }

      // Tip detection
      if (/^(?:tip|hint|note):/i.test(text)) {
        result.tips.push(text.replace(/^(?:tip|hint|note):\s*/i, ''));
        i++;
        continue;
      }

      // Warning detection
      if (/^(?:warning|caution|danger):/i.test(text)) {
        result.warnings.push(text.replace(/^(?:warning|caution|danger):\s*/i, ''));
        i++;
        continue;
      }

      if (!instructionSet) {
        result.instruction = text;
        instructionSet = true;
      } else {
        result.paragraphs.push(text);
      }
      i++;
      continue;
    }

    // Lists within section (including nested children)
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const text = getBlockText(block);
      // Check if it looks like an activity
      const actMatch = text.match(/^(.+?)\s*\((\d+\s*(?:min|minute)s?)\)/i);
      if (actMatch) {
        result.activities.push({ text: actMatch[1].trim(), duration: actMatch[2] });
      } else {
        result.paragraphs.push('• ' + text);
      }
      // Extract nested children within list items
      if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText && childText.trim()) {
            result.paragraphs.push('  • ' + childText);
          }
          if (child.children && child.children.length > 0) {
            for (const gc of child.children) {
              const gcText = getBlockText(gc);
              if (gcText && gcText.trim()) {
                result.paragraphs.push('    • ' + gcText);
              }
            }
          }
        }
      }
      i++;
      continue;
    }

    // Toggle blocks within section — extract heading + recurse into children
    if (block.type === 'toggle') {
      const text = getBlockText(block);
      if (text.trim()) result.paragraphs.push('**' + text + '**');
      if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText && childText.trim()) {
            result.paragraphs.push('• ' + childText);
          }
          // Handle tables inside toggles
          if (child.type === 'table' && child.children) {
            const tableRows = child.children.filter(c => c.type === 'table_row');
            for (const row of tableRows) {
              const cells = row.table_row.cells.map(cell => extractRichText(cell));
              const line = cells.filter(c => c.trim()).join(' | ');
              if (line.trim()) result.paragraphs.push(line);
            }
          }
          // Handle nested children of list items
          if (child.children && child.children.length > 0 && child.type !== 'table') {
            for (const grandchild of child.children) {
              const gcText = getBlockText(grandchild);
              if (gcText && gcText.trim()) result.paragraphs.push('  • ' + gcText);
            }
          }
        }
      }
      i++;
      continue;
    }

    // Callouts within section
    if (block.type === 'callout' && block.callout) {
      const text = extractRichText(block.callout.rich_text);
      const color = block.callout.color || '';
      if (color.includes('red') || color.includes('yellow')) {
        result.warnings.push(text);
      } else if (color.includes('green') || color.includes('blue')) {
        result.tips.push(text);
      } else {
        result.paragraphs.push(text);
      }
      // Also extract callout children
      if (block.children) {
        for (const child of block.children) {
          const childText = getBlockText(child);
          if (childText && childText.trim()) result.paragraphs.push(childText);
        }
      }
      i++;
      continue;
    }

    // Tables within section — capture all content
    if (block.type === 'table' && block.children) {
      const tableRows = block.children.filter(c => c.type === 'table_row');
      for (const row of tableRows) {
        const cells = row.table_row.cells.map(cell => extractRichText(cell));
        const line = cells.filter(c => c.trim()).join(' | ');
        if (line.trim()) result.paragraphs.push(line);
      }
      i++;
      continue;
    }

    // Quote blocks
    if (block.type === 'quote') {
      result.quotes.push(getBlockText(block));
      i++;
      continue;
    }

    // To-do blocks within section
    if (block.type === 'to_do') {
      const text = getBlockText(block);
      if (text) result.paragraphs.push('• ' + text);
      i++;
      continue;
    }

    // Divider → end of section
    if (block.type === 'divider') {
      i++;
      break;
    }

    // Other blocks → paragraph
    const text = getBlockText(block);
    if (text) result.paragraphs.push(text);
    i++;
  }

  result.endIndex = i;
  if (!result.instruction && result.paragraphs.length > 0) {
    result.instruction = result.paragraphs.shift();
  }
  return result;
}

// ---------------------------------------------------------------------------
// Lexical document creation
// ---------------------------------------------------------------------------

function createLexical(text) {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  return {
    root: {
      type: 'root',
      children: paragraphs.map(paragraph => ({
        type: 'paragraph',
        children: [{
          type: 'text',
          text: paragraph.trim(),
          format: 0,
          detail: 0,
          mode: 'normal',
          style: '',
          version: 1,
        }],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Payload REST API helpers
// ---------------------------------------------------------------------------

async function payloadCreate(collection, data) {
  if (DRY_RUN) {
    console.log(`      [DRY RUN] Would create ${collection}: ${data.title || data.slug || '?'}`);
    return { id: 'dry-run-' + Math.random().toString(36).substr(2, 9) };
  }

  const response = await fetch(`${PAYLOAD_URL}/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `JWT ${PAYLOAD_TOKEN}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create ${collection}: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.doc;
}

async function payloadUpdate(collection, id, data) {
  if (DRY_RUN) return;

  const response = await fetch(`${PAYLOAD_URL}/${collection}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `JWT ${PAYLOAD_TOKEN}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update ${collection}/${id}: ${response.status} ${error}`);
  }
}

async function payloadFind(collection, query = {}) {
  const params = new URLSearchParams();
  if (query.where) {
    for (const [field, condition] of Object.entries(query.where)) {
      for (const [op, value] of Object.entries(condition)) {
        params.append(`where[${field}][${op}]`, value);
      }
    }
  }
  params.append('limit', String(query.limit || 100));

  const response = await fetch(`${PAYLOAD_URL}/${collection}?${params.toString()}`);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to query ${collection}: ${response.status} ${error}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Slugify
// ---------------------------------------------------------------------------

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

function isResourceTitle(title) {
  const lower = title.toLowerCase();
  return (
    lower.includes('resource') || lower.includes('image') ||
    lower.includes('software') || lower.includes('feedback') ||
    lower.includes('style guide') || lower.includes('template') ||
    lower.includes('download') || lower.includes('accreditation') ||
    lower.includes('administration') || lower.startsWith('📂') ||
    lower.includes('ocn') || lower.includes('master style') ||
    lower.includes('assessment handbook') || lower.includes('health and safety handbook')
  );
}

// ---------------------------------------------------------------------------
// Course migration
// ---------------------------------------------------------------------------

async function migrateCourse(course) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📗 Course: ${course.title}`);
  console.log(`${'─'.repeat(60)}`);

  const client = createNotionClient(course.notionApiKey);

  // Check if course already exists
  const existing = await payloadFind('courses', { where: { slug: { equals: course.slug } }, limit: 1 });
  if (existing.docs.length > 0) {
    console.log(`   ⏭ Course already exists. Skipping.`);
    return;
  }

  // Fetch module pages from Notion
  console.log(`\n   📂 Fetching course structure from Notion...`);
  const topLevelPages = await fetchChildPages(client, course.notionNavId);
  const modulePages = topLevelPages.filter(p => !isResourceTitle(p.title));
  console.log(`   Found ${modulePages.length} module pages (${topLevelPages.length - modulePages.length} filtered out)`);

  const createdModuleIds = [];

  for (let mi = 0; mi < modulePages.length; mi++) {
    const modulePage = modulePages[mi];
    console.log(`\n   📁 Module ${mi + 1}/${modulePages.length}: "${modulePage.title}"`);

    // Create module FIRST so we have a valid ID for lessons
    let moduleId;
    try {
      const mod = await payloadCreate('modules', {
        title: modulePage.title,
        slug: slugify(modulePage.title) || `module-${modulePage.id.slice(0, 8)}`,
        order: mi,
        icon: modulePage.icon || null,
        lessons: [],
      });
      moduleId = mod.id;
      createdModuleIds.push(moduleId);
      stats.modules++;
      console.log(`      ✅ Module created (id: ${moduleId})`);
    } catch (e) {
      console.error(`   ❌ Failed to create module: ${e.message}`);
      stats.errors++;
      continue;
    }

    await sleep(200);

    // Fetch lesson pages under this module
    const lessonPages = await fetchChildPages(client, modulePage.id);
    console.log(`      Found ${lessonPages.length} lesson(s)`);

    const createdLessonIds = [];

    // If module has no child pages, the module itself may contain lesson content
    if (lessonPages.length === 0) {
      const blocks = await fetchNotionBlocks(client, modulePage.id);
      const contentBlocks = blocks.filter(b => b.type !== 'child_page' && b.type !== 'child_database');

      if (contentBlocks.length > 0) {
        console.log(`      📄 Module contains direct content (${contentBlocks.length} blocks) — treating as lesson`);
        const payloadBlocks = notionBlocksToPayloadBlocks(contentBlocks);

        try {
          const lesson = await payloadCreate('lessons', {
            title: modulePage.title,
            slug: slugify(modulePage.title) || `lesson-${modulePage.id.slice(0, 8)}`,
            module: moduleId,
            order: 0,
            icon: modulePage.icon || null,
            sections: payloadBlocks,
          });
          createdLessonIds.push(lesson.id);
          stats.lessons++;
          console.log(`      ✅ Lesson: "${modulePage.title}" (${payloadBlocks.length} blocks)`);
        } catch (e) {
          console.error(`      ❌ Failed: ${e.message}`);
          stats.errors++;
        }
      }
    }

    // Process each lesson page
    for (let li = 0; li < lessonPages.length; li++) {
      const lessonPage = lessonPages[li];
      console.log(`      📄 Lesson ${li + 1}/${lessonPages.length}: "${lessonPage.title}"`);

      try {
        await sleep(200);
        const blocks = await fetchNotionBlocks(client, lessonPage.id);
        const payloadBlocks = notionBlocksToPayloadBlocks(blocks);

        const lesson = await payloadCreate('lessons', {
          title: lessonPage.title,
          slug: slugify(lessonPage.title) || `lesson-${lessonPage.id.slice(0, 8)}`,
          module: moduleId,
          order: li,
          icon: lessonPage.icon || null,
          sections: payloadBlocks,
        });

        createdLessonIds.push(lesson.id);
        stats.lessons++;
        console.log(`         → ${payloadBlocks.length} blocks created`);
      } catch (e) {
        console.error(`         ❌ Failed: ${e.message}`);
        stats.errors++;
      }
    }

    // Update module with lesson references
    if (createdLessonIds.length > 0) {
      try {
        await payloadUpdate('modules', moduleId, { lessons: createdLessonIds });
        console.log(`   ✅ Module updated with ${createdLessonIds.length} lessons`);
      } catch (e) {
        console.error(`   ⚠ Failed to update module lessons: ${e.message}`);
      }
    }
  }

  // Create course
  try {
    await payloadCreate('courses', {
      title: course.title,
      slug: course.slug,
      shortTitle: course.shortTitle || null,
      description: course.description || null,
      color: course.color || 'green',
      icon: course.icon || null,
      order: 0,
      duration: course.duration || null,
      level: course.level || null,
      accreditation: course.accreditation || null,
      enabled: course.enabled,
      isHandbook: false,
      modules: createdModuleIds,
    });

    stats.courses++;
    console.log(`\n   ✅ Course "${course.title}" created!`);
  } catch (e) {
    console.error(`\n   ❌ Failed to create course: ${e.message}`);
    stats.errors++;
  }
}

// ---------------------------------------------------------------------------
// Handbook migration
// ---------------------------------------------------------------------------

async function migrateHandbook(course) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📖 Handbook: ${course.title}`);
  console.log(`${'─'.repeat(60)}`);

  // Check if handbooks already exist
  const existing = await payloadFind('handbooks', { limit: 1 });
  if (existing.docs.length > 0) {
    console.log(`   ⏭ Handbook sections already exist. Skipping.`);
    return;
  }

  console.log(`\n   📖 Fetching handbook data from Notion...`);

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${course.notionNavId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${course.notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   Found ${data.results.length} handbook pages`);

    let order = 0;
    for (const page of data.results) {
      if (!page.properties) continue;
      const props = page.properties;

      let name = 'Untitled';
      if (props.Name?.type === 'title' && props.Name.title?.[0]) {
        name = props.Name.title[0].plain_text;
      }

      const chapter = extractProp(props, 'Chapter', 'rich_text');
      const section = extractProp(props, 'Section', 'rich_text');
      const icon = extractProp(props, 'Icon', 'rich_text');
      const pageRange = extractProp(props, 'Page Range', 'rich_text') || extractProp(props, 'Pages', 'rich_text');
      const estTime = extractProp(props, 'Est. Time', 'rich_text');
      const hasVideo = props['Has Video']?.checkbox || false;
      const orderProp = props.Order?.number;

      try {
        await payloadCreate('handbooks', {
          title: name,
          slug: slugify(name) || `handbook-${page.id.slice(0, 8)}`,
          chapter: chapter || null,
          section: section || null,
          icon: icon || null,
          pageRange: pageRange || null,
          estTime: estTime || null,
          hasVideo,
          order: orderProp ?? order,
        });

        stats.handbooks++;
        console.log(`      ✅ "${name}"`);
      } catch (e) {
        console.error(`      ❌ "${name}": ${e.message}`);
        stats.errors++;
      }
      order++;
    }

    // Also create the course record for the handbook
    const existingCourse = await payloadFind('courses', { where: { slug: { equals: course.slug } }, limit: 1 });
    if (existingCourse.docs.length === 0) {
      await payloadCreate('courses', {
        title: course.title,
        slug: course.slug,
        shortTitle: course.shortTitle || null,
        description: course.description || null,
        color: course.color || 'teal',
        icon: course.icon || null,
        order: 1,
        duration: course.duration || null,
        level: course.level || null,
        enabled: course.enabled,
        isHandbook: true,
        modules: [],
      });
      stats.courses++;
    }

    console.log(`\n   ✅ Handbook migrated (${stats.handbooks} sections)`);
  } catch (e) {
    console.error(`\n   ❌ Failed: ${e.message}`);
    stats.errors++;
  }
}

function extractProp(props, name, type) {
  if (!(name in props)) return '';
  const prop = props[name];
  if (type === 'rich_text' && prop.type === 'rich_text') {
    return prop.rich_text?.[0]?.plain_text || '';
  }
  if (type === 'select' && prop.type === 'select') {
    return prop.select?.name || '';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🚀 Notion → Payload CMS Migration (REST API)');
  console.log('='.repeat(60));
  if (DRY_RUN) console.log('🔍 DRY RUN MODE\n');

  // Check dev server is running and authenticate
  try {
    const health = await fetch(`${PAYLOAD_URL}/courses?limit=0`);
    if (!health.ok) throw new Error(`Status ${health.status}`);
    console.log('✅ Payload REST API is accessible');

    PAYLOAD_TOKEN = await getPayloadToken();
    console.log('✅ Authenticated with Payload\n');
  } catch (e) {
    console.error('❌ Cannot reach or authenticate with Payload REST API at ' + PAYLOAD_URL);
    console.error('   Make sure the dev server is running: npm run dev');
    console.error('   Error:', e.message);
    process.exit(1);
  }

  for (const course of COURSES) {
    if (course.isHandbook) {
      await migrateHandbook(course);
    } else {
      await migrateCourse(course);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Migration Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Courses:   ${stats.courses}`);
  console.log(`   Modules:   ${stats.modules}`);
  console.log(`   Lessons:   ${stats.lessons}`);
  console.log(`   Handbooks: ${stats.handbooks}`);
  console.log(`   Errors:    ${stats.errors}`);
  console.log(`\n✅ Migration complete!\n`);

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('\n💥 Migration failed:', e);
  process.exit(1);
});
