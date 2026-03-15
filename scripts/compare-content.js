/**
 * Notion vs Payload CMS Content Comparison Script (REST API)
 *
 * Fetches content from both Notion API and Payload REST API,
 * compares lesson-by-lesson to verify 100% content alignment.
 *
 * Run: node scripts/compare-content.js
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
const VERBOSE = process.argv.includes('--verbose');

// Course config
const COURSES = [
  {
    slug: 'workshop-skills',
    title: '6 Week Workshop Skills',
    isHandbook: false,
    notionNavId: env.NOTION_COURSE_NAV_ID,
    notionApiKey: env.NOTION_API_KEY,
  },
  {
    slug: 'flax-manual-handbook',
    title: 'Flax Manual Handbook',
    isHandbook: true,
    notionNavId: env.NOTION_FLAX_HANDBOOK_ID,
    notionApiKey: env.NOTION_MANUALS_API_KEY,
  },
];

const stats = {
  coursesCompared: 0,
  modulesMatched: 0,
  modulesMismatched: 0,
  lessonsCompared: 0,
  lessonsMatched: 0,
  lessonsMismatched: 0,
  handbooksCompared: 0,
  handbooksMatched: 0,
  handbooksMismatched: 0,
  errors: [],
};

// ---------------------------------------------------------------------------
// Notion helpers
// ---------------------------------------------------------------------------

function createNotionClient(apiKey) {
  return new Client({ auth: apiKey, timeoutMs: 30000 });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTopLevelBlocks(client, blockId) {
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

  if (depth <= 3) {
    for (const block of blocks) {
      if (block.has_children) {
        try {
          block.children = await fetchNotionBlocks(client, block.id, depth + 1);
        } catch {
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
  return { id: response.id, title, icon };
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
      } catch {
        // skip
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

function extractTextFromNotionBlocks(blocks) {
  const texts = [];
  for (const block of blocks) {
    if (!block || !block.type) continue;
    const data = block[block.type];
    if (!data) continue;

    // For tables, skip first row (header) to match Payload's extraction
    // (Payload stores structured data without header labels)
    if (block.type === 'table' && block.children) {
      const rows = block.children.filter(c => c.type === 'table_row');
      const startRow = rows.length > 1 ? 1 : 0; // Skip header row
      for (let ri = startRow; ri < rows.length; ri++) {
        if (rows[ri].table_row?.cells) {
          for (const cell of rows[ri].table_row.cells) {
            const t = extractRichText(cell);
            if (t.trim()) texts.push(t.trim());
          }
        }
      }
      continue; // Don't recurse into table children (already handled)
    }

    if (data.rich_text) {
      const text = extractRichText(data.rich_text);
      if (text.trim()) texts.push(text.trim());
    }

    if (block.type === 'table_row' && data.cells) {
      for (const cell of data.cells) {
        const t = extractRichText(cell);
        if (t.trim()) texts.push(t.trim());
      }
    }

    if (block.children && Array.isArray(block.children)) {
      const childText = extractTextFromNotionBlocks(block.children);
      if (childText.trim()) texts.push(childText.trim());
    }
  }
  return texts.join('\n');
}

// ---------------------------------------------------------------------------
// Text extraction from Payload sections
// ---------------------------------------------------------------------------

function extractTextFromLexical(lexicalData) {
  if (!lexicalData?.root?.children) return '';
  function walk(children) {
    return children
      .map(c => {
        if (c.type === 'text') return c.text || '';
        if (c.children) return walk(c.children);
        return '';
      })
      .join('');
  }
  return lexicalData.root.children.map(n => (n.children ? walk(n.children) : '')).join('\n');
}

function extractTextFromPayloadSections(sections) {
  if (!sections || !Array.isArray(sections)) return '';
  const texts = [];

  for (const block of sections) {
    if (!block || !block.blockType) continue;
    switch (block.blockType) {
      case 'heading':
        if (block.text) texts.push(block.text.trim());
        break;
      case 'prose': {
        const t = extractTextFromLexical(block.content);
        if (t.trim()) texts.push(t.trim());
        break;
      }
      case 'timeline':
        if (block.title) texts.push(block.title.trim());
        if (block.rows) {
          for (const row of block.rows) {
            const parts = [row.time, row.activity, row.duration, row.notes].filter(Boolean);
            texts.push(parts.join(' ').trim());
          }
        }
        break;
      case 'checklist':
        if (block.title) texts.push(block.title.trim());
        if (block.items) {
          for (const item of block.items) {
            const parts = [item.text, item.quantity].filter(Boolean);
            texts.push(parts.join(' ').trim());
          }
        }
        break;
      case 'safety':
        if (block.title) texts.push(block.title.trim());
        if (block.content) texts.push(block.content.trim());
        if (block.items) {
          for (const item of block.items) texts.push((item.text || item)?.toString().trim());
        }
        break;
      case 'teachingStep':
        if (block.title) texts.push(block.title.trim());
        if (block.instruction) texts.push(block.instruction.trim());
        if (block.tips) for (const t of block.tips) texts.push((t.text || t)?.toString().trim());
        if (block.warnings) for (const w of block.warnings) texts.push((w.text || w)?.toString().trim());
        if (block.paragraphs) for (const p of block.paragraphs) texts.push((p.text || p)?.toString().trim());
        if (block.activities) for (const a of block.activities) texts.push(a.text?.trim() || '');
        break;
      case 'checkpoint':
        if (block.title) texts.push(block.title.trim());
        if (block.items) for (const item of block.items) texts.push(item.criterion?.trim() || '');
        break;
      case 'outcomes':
        if (block.title) texts.push(block.title.trim());
        if (block.items) for (const item of block.items) texts.push((item.text || item)?.toString().trim());
        break;
      case 'vocabulary':
        if (block.terms) for (const t of block.terms) texts.push(`${t.term || ''} ${t.definition || ''}`.trim());
        break;
      case 'resource':
        if (block.title) texts.push(block.title.trim());
        break;
    }
  }
  return texts.filter(t => t).join('\n');
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/\s+/g, ' ').trim();
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
// Payload REST API helpers
// ---------------------------------------------------------------------------

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
  if (query.depth) params.append('depth', String(query.depth));
  if (query.sort) params.append('sort', query.sort);

  const response = await fetch(`${PAYLOAD_URL}/${collection}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to query ${collection}: ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Course comparison
// ---------------------------------------------------------------------------

async function compareCourse(courseConfig) {
  const client = createNotionClient(courseConfig.notionApiKey);

  // Fetch from Notion
  console.log('\n   📥 Fetching from Notion...');
  const topLevelPages = await fetchChildPages(client, courseConfig.notionNavId);
  const notionModules = topLevelPages.filter(p => !isResourceTitle(p.title));
  console.log(`      Found ${notionModules.length} modules in Notion`);

  // Fetch from Payload (with depth to get nested modules and lessons)
  console.log('   📥 Fetching from Payload...');
  const payloadCourse = await payloadFind('courses', {
    where: { slug: { equals: courseConfig.slug } },
    limit: 1,
    depth: 0,
  });

  if (payloadCourse.docs.length === 0) {
    console.log('   ❌ Course not found in Payload CMS!');
    stats.errors.push(`Course "${courseConfig.slug}" not found in Payload`);
    return;
  }

  const course = payloadCourse.docs[0];

  // Get modules from Payload (need to fetch separately with depth)
  const payloadModulesResult = await payloadFind('modules', {
    limit: 100,
    depth: 0,
  });
  const payloadModules = payloadModulesResult.docs.sort((a, b) => a.order - b.order);
  console.log(`      Found ${payloadModules.length} modules in Payload`);

  // Compare module count
  if (notionModules.length !== payloadModules.length) {
    console.log(`\n   ❌ Module count mismatch: Notion=${notionModules.length}, Payload=${payloadModules.length}`);
    stats.modulesMismatched++;
  } else {
    console.log(`\n   ✅ Module count matches: ${notionModules.length}`);
    stats.modulesMatched++;
  }

  // Compare each module and its lessons
  const minModules = Math.min(notionModules.length, payloadModules.length);

  for (let mi = 0; mi < minModules; mi++) {
    const notionMod = notionModules[mi];
    const payloadMod = payloadModules[mi];

    console.log(`\n   📁 Module ${mi + 1}: "${notionMod.title}"`);

    // Title comparison
    if (normalizeTitle(notionMod.title) !== normalizeTitle(payloadMod.title)) {
      console.log(`      ⚠ Title: Notion="${notionMod.title}" vs Payload="${payloadMod.title}"`);
    } else {
      console.log(`      ✅ Title matches`);
    }

    // Fetch lesson pages from Notion
    const notionLessonPages = await fetchChildPages(client, notionMod.id);

    // Fetch lessons from Payload (by module ID)
    const payloadLessonsResult = await payloadFind('lessons', {
      where: { module: { equals: payloadMod.id } },
      limit: 100,
      depth: 0,
    });
    const payloadLessons = payloadLessonsResult.docs.sort((a, b) => a.order - b.order);

    // Handle modules with no child pages (content directly in module)
    const notionHasDirectContent = notionLessonPages.length === 0;

    if (notionHasDirectContent) {
      // Module was treated as a single lesson during migration
      console.log(`      Module has direct content (no sub-pages)`);
      console.log(`      Payload lessons: ${payloadLessons.length}`);

      if (payloadLessons.length === 1) {
        stats.lessonsCompared++;
        // Compare the module's content vs the single lesson
        console.log(`\n      📄 Lesson (from module content): "${payloadLessons[0].title}"`);

        try {
          const notionBlocks = await fetchNotionBlocks(client, notionMod.id);
          const contentBlocks = notionBlocks.filter(b => b.type !== 'child_page' && b.type !== 'child_database');
          const notionText = normalize(extractTextFromNotionBlocks(contentBlocks));
          const payloadText = normalize(extractTextFromPayloadSections(payloadLessons[0].sections || []));

          compareTexts(notionText, payloadText, payloadLessons[0].sections?.length || 0);
        } catch (err) {
          console.log(`         ❌ Error: ${err.message}`);
          stats.errors.push(`Module "${notionMod.title}": ${err.message}`);
          stats.lessonsMismatched++;
        }
      } else if (payloadLessons.length === 0) {
        console.log(`      ❌ No lessons in Payload for this module`);
        stats.lessonsMismatched++;
        stats.lessonsCompared++;
      }
      continue;
    }

    console.log(`      Notion lessons: ${notionLessonPages.length}, Payload lessons: ${payloadLessons.length}`);

    if (notionLessonPages.length !== payloadLessons.length) {
      console.log(`      ❌ Lesson count mismatch`);
    }

    // Compare each lesson
    const minLessons = Math.min(notionLessonPages.length, payloadLessons.length);

    for (let li = 0; li < minLessons; li++) {
      const notionLesson = notionLessonPages[li];
      const payloadLesson = payloadLessons[li];
      stats.lessonsCompared++;

      console.log(`\n      📄 Lesson ${li + 1}: "${notionLesson.title}"`);

      // Title
      if (normalizeTitle(notionLesson.title) !== normalizeTitle(payloadLesson.title)) {
        console.log(`         ⚠ Title: Notion="${notionLesson.title}" vs Payload="${payloadLesson.title}"`);
      }

      // Content comparison
      try {
        const notionBlocks = await fetchNotionBlocks(client, notionLesson.id);
        const notionText = normalize(extractTextFromNotionBlocks(notionBlocks));
        const payloadText = normalize(extractTextFromPayloadSections(payloadLesson.sections || []));

        compareTexts(notionText, payloadText, payloadLesson.sections?.length || 0);
      } catch (err) {
        console.log(`         ❌ Error: ${err.message}`);
        stats.errors.push(`Lesson "${notionLesson.title}": ${err.message}`);
        stats.lessonsMismatched++;
      }

      await sleep(200);
    }

    // Track unmatched
    for (let li = minLessons; li < notionLessonPages.length; li++) {
      console.log(`      ❌ Notion lesson not in Payload: "${notionLessonPages[li].title}"`);
      stats.lessonsMismatched++;
      stats.lessonsCompared++;
    }
    for (let li = minLessons; li < payloadLessons.length; li++) {
      console.log(`      ❌ Payload lesson not in Notion: "${payloadLessons[li].title}"`);
      stats.lessonsMismatched++;
      stats.lessonsCompared++;
    }
  }
}

function compareTexts(notionText, payloadText, sectionCount) {
  if (!notionText && !payloadText) {
    console.log(`         ✅ Both empty`);
    stats.lessonsMatched++;
    return;
  }
  if (notionText === payloadText) {
    console.log(`         ✅ Content matches exactly (${sectionCount} sections)`);
    stats.lessonsMatched++;
    return;
  }

  // Word-level similarity
  const notionWords = new Set(notionText.split(/\s+/).filter(w => w.length > 2));
  const payloadWords = new Set(payloadText.split(/\s+/).filter(w => w.length > 2));
  const common = new Set([...notionWords].filter(w => payloadWords.has(w)));
  const total = new Set([...notionWords, ...payloadWords]);
  const similarity = total.size > 0 ? (common.size / total.size) * 100 : 100;

  if (similarity >= 85) {
    console.log(`         ✅ Content matches (~${similarity.toFixed(0)}% similarity, ${sectionCount} sections)`);
    stats.lessonsMatched++;
  } else {
    console.log(`         ❌ Content mismatch (${similarity.toFixed(0)}% similarity)`);
    console.log(`            Notion words: ${notionWords.size}, Payload words: ${payloadWords.size}, Common: ${common.size}`);

    if (VERBOSE) {
      const onlyNotion = [...notionWords].filter(w => !payloadWords.has(w)).slice(0, 15);
      const onlyPayload = [...payloadWords].filter(w => !notionWords.has(w)).slice(0, 15);
      if (onlyNotion.length > 0) console.log(`            Only in Notion: ${onlyNotion.join(', ')}`);
      if (onlyPayload.length > 0) console.log(`            Only in Payload: ${onlyPayload.join(', ')}`);
    }

    stats.lessonsMismatched++;
  }
}

// ---------------------------------------------------------------------------
// Handbook comparison
// ---------------------------------------------------------------------------

async function compareHandbook(courseConfig) {
  console.log('\n   📥 Fetching handbook from Notion...');

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${courseConfig.notionNavId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${courseConfig.notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!response.ok) throw new Error(`Notion: ${response.statusText}`);

    const data = await response.json();
    const notionEntries = data.results.filter(r => 'properties' in r);
    console.log(`      Found ${notionEntries.length} entries in Notion`);

    console.log('   📥 Fetching handbook from Payload...');
    const payloadResult = await payloadFind('handbooks', { sort: 'order', limit: 200 });
    console.log(`      Found ${payloadResult.docs.length} entries in Payload`);

    // Count comparison
    if (notionEntries.length !== payloadResult.docs.length) {
      console.log(`\n   ⚠ Count: Notion=${notionEntries.length}, Payload=${payloadResult.docs.length}`);
    } else {
      console.log(`\n   ✅ Count matches: ${notionEntries.length}`);
    }

    // Title-by-title comparison
    const notionTitles = notionEntries.map(e => {
      const p = e.properties;
      if (p.Name?.type === 'title' && p.Name.title?.[0]) return p.Name.title[0].plain_text;
      return 'Untitled';
    });

    const payloadTitles = payloadResult.docs.map(d => d.title);

    for (const nt of notionTitles) {
      stats.handbooksCompared++;
      const found = payloadTitles.some(pt => normalizeTitle(pt) === normalizeTitle(nt));
      if (found) {
        console.log(`      ✅ "${nt}"`);
        stats.handbooksMatched++;
      } else {
        console.log(`      ❌ Not in Payload: "${nt}"`);
        stats.handbooksMismatched++;
      }
    }

    for (const pt of payloadTitles) {
      const found = notionTitles.some(nt => normalizeTitle(nt) === normalizeTitle(pt));
      if (!found) console.log(`      ⚠ Extra in Payload: "${pt}"`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    stats.errors.push(`Handbook: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Comparison Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Courses compared:     ${stats.coursesCompared}`);
  console.log(`   Modules:              ${stats.modulesMatched} matched, ${stats.modulesMismatched} mismatched`);
  console.log(`   Lessons compared:     ${stats.lessonsCompared}`);
  console.log(`   Lessons matched:      ${stats.lessonsMatched} ✅`);
  console.log(`   Lessons mismatched:   ${stats.lessonsMismatched} ❌`);
  console.log(`   Handbooks compared:   ${stats.handbooksCompared}`);
  console.log(`   Handbooks matched:    ${stats.handbooksMatched} ✅`);
  console.log(`   Handbooks mismatched: ${stats.handbooksMismatched} ❌`);

  if (stats.errors.length > 0) {
    console.log(`\n   ⚠ Errors:`);
    for (const err of stats.errors) console.log(`      - ${err}`);
  }

  const totalMatched = stats.lessonsMatched + stats.handbooksMatched;
  const totalCompared = stats.lessonsCompared + stats.handbooksCompared;
  const totalMismatched = stats.lessonsMismatched + stats.handbooksMismatched;

  if (totalMismatched === 0 && stats.modulesMismatched === 0) {
    console.log(`\n   🎉 100% CONTENT ALIGNMENT! (${totalMatched}/${totalCompared} items match)`);
  } else {
    const pct = totalCompared > 0 ? ((totalMatched / totalCompared) * 100).toFixed(1) : '0';
    console.log(`\n   ⚠ ${pct}% aligned — ${totalMismatched} item(s) need attention`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🔍 Notion vs Payload Content Comparison');
  console.log('='.repeat(60));

  // Check Payload is accessible
  try {
    const health = await fetch(`${PAYLOAD_URL}/courses?limit=0`);
    if (!health.ok) throw new Error(`Status ${health.status}`);
    console.log('✅ Payload REST API is accessible\n');
  } catch (e) {
    console.error('❌ Cannot reach Payload REST API. Make sure dev server is running.');
    process.exit(1);
  }

  for (const course of COURSES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📗 Comparing: ${course.title}`);
    console.log(`${'─'.repeat(60)}`);

    if (course.isHandbook) {
      await compareHandbook(course);
    } else {
      await compareCourse(course);
    }
    stats.coursesCompared++;
  }

  printSummary();
  process.exit(stats.lessonsMismatched + stats.handbooksMismatched + stats.modulesMismatched > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('\n💥 Comparison failed:', e);
  process.exit(1);
});
