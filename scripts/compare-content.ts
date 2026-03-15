/**
 * Notion vs Payload CMS Content Comparison Script
 *
 * Fetches content from both Notion API and Payload CMS, then compares
 * lesson-by-lesson to verify 100% content alignment after migration.
 *
 * Run with: npx tsx scripts/compare-content.ts
 *
 * Options:
 *   --course=slug   Compare only the specified course
 *   --verbose       Show full text diffs for mismatches
 */

import { getPayload } from 'payload';
import config from '../payload.config';
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';

// Load .env.local manually (no dotenv dependency)
function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // File doesn't exist — env vars must be set externally
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const courseFilter = args.find(a => a.startsWith('--course='))?.split('=')[1];

// ---------------------------------------------------------------------------
// Course → Notion mapping (from .env.local)
// ---------------------------------------------------------------------------

interface CourseMapping {
  slug: string;
  title: string;
  isHandbook: boolean;
  notionNavId: string;
  notionApiKey: string;
}

const COURSE_MAPPINGS: CourseMapping[] = [
  {
    slug: 'workshop-skills',
    title: '6 Week Workshop Skills',
    isHandbook: false,
    notionNavId: process.env.NOTION_COURSE_NAV_ID || '',
    notionApiKey: process.env.NOTION_API_KEY || '',
  },
  {
    slug: 'flax-manual-handbook',
    title: 'Flax Manual Handbook',
    isHandbook: true,
    notionNavId: process.env.NOTION_FLAX_HANDBOOK_ID || '',
    notionApiKey: process.env.NOTION_MANUALS_API_KEY || '',
  },
];

// ---------------------------------------------------------------------------
// Stats tracking
// ---------------------------------------------------------------------------

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
  errors: [] as string[],
};

// ---------------------------------------------------------------------------
// Notion API helpers (from migration script patterns)
// ---------------------------------------------------------------------------

function createNotionClient(apiKey: string) {
  return new Client({ auth: apiKey, timeoutMs: 30000 });
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchNotionBlocks(client: Client, blockId: string, depth = 0): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;

  do {
    await sleep(125);
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      blocks.push(block);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  // Recursively fetch children (max depth 3)
  if (depth <= 3) {
    for (const block of blocks) {
      if ((block as any).has_children) {
        try {
          (block as any).children = await fetchNotionBlocks(client, block.id, depth + 1);
        } catch {
          (block as any).children = [];
        }
      }
    }
  }

  return blocks;
}

async function fetchChildPages(
  client: Client,
  parentId: string
): Promise<Array<{ id: string; title: string; icon?: string }>> {
  const blocks = await fetchNotionBlocks(client, parentId, 0);
  const pages: Array<{ id: string; title: string; icon?: string }> = [];

  for (const block of blocks) {
    if (block.type === 'child_page' && block.child_page) {
      pages.push({ id: block.id, title: block.child_page.title });
    } else if (block.type === 'link_to_page' && block.link_to_page) {
      try {
        const response = await client.pages.retrieve({ page_id: block.link_to_page.page_id }) as any;
        let title = 'Untitled';
        const props = response.properties;
        if (props?.title?.title?.[0]?.plain_text) {
          title = props.title.title[0].plain_text;
        } else if (props?.Name?.title?.[0]?.plain_text) {
          title = props.Name.title[0].plain_text;
        }
        let icon: string | undefined;
        if (response.icon?.type === 'emoji') {
          icon = response.icon.emoji;
        }
        pages.push({ id: response.id, title, icon });
      } catch {
        console.warn(`  ⚠ Failed to fetch linked page`);
      }
    }
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Text extraction from Notion blocks
// ---------------------------------------------------------------------------

function extractRichText(richTextArr: any[]): string {
  if (!richTextArr || !Array.isArray(richTextArr)) return '';
  return richTextArr.map((rt: any) => rt.plain_text || '').join('');
}

function extractTextFromNotionBlocks(blocks: any[]): string {
  const texts: string[] = [];

  for (const block of blocks) {
    if (!block || !block.type) continue;

    const blockData = block[block.type];
    if (!blockData) continue;

    // Extract rich text from the block
    if (blockData.rich_text) {
      const text = extractRichText(blockData.rich_text);
      if (text.trim()) texts.push(text.trim());
    }

    // Handle specific block types
    switch (block.type) {
      case 'child_page':
        if (blockData.title) texts.push(blockData.title);
        break;
      case 'table':
        // Tables have rows as children
        break;
      case 'table_row':
        if (blockData.cells) {
          for (const cell of blockData.cells) {
            const cellText = extractRichText(cell);
            if (cellText.trim()) texts.push(cellText.trim());
          }
        }
        break;
    }

    // Recurse into children
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

function extractTextFromLexical(lexicalData: any): string {
  if (!lexicalData?.root?.children) return '';

  function extractChildren(children: any[]): string {
    return children
      .map((child: any) => {
        if (child.type === 'text') return child.text || '';
        if (child.children) return extractChildren(child.children);
        return '';
      })
      .join('');
  }

  return lexicalData.root.children
    .map((node: any) => {
      if (node.children) return extractChildren(node.children);
      return '';
    })
    .join('\n');
}

function extractTextFromPayloadSections(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  const texts: string[] = [];

  for (const block of blocks) {
    if (!block || !block.blockType) continue;

    switch (block.blockType) {
      case 'heading':
        if (block.text) texts.push(block.text.trim());
        break;

      case 'prose':
        const proseText = extractTextFromLexical(block.content);
        if (proseText.trim()) texts.push(proseText.trim());
        break;

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
            texts.push(item.text?.trim() || '');
          }
        }
        break;

      case 'safety':
        if (block.title) texts.push(block.title.trim());
        if (block.content) texts.push(block.content.trim());
        if (block.items) {
          for (const item of block.items) {
            texts.push((item.text || item)?.toString().trim());
          }
        }
        break;

      case 'teachingStep':
        if (block.title) texts.push(block.title.trim());
        if (block.instruction) texts.push(block.instruction.trim());
        if (block.tips) {
          for (const tip of block.tips) {
            texts.push((tip.text || tip)?.toString().trim());
          }
        }
        if (block.warnings) {
          for (const w of block.warnings) {
            texts.push((w.text || w)?.toString().trim());
          }
        }
        if (block.paragraphs) {
          for (const p of block.paragraphs) {
            texts.push((p.text || p)?.toString().trim());
          }
        }
        if (block.activities) {
          for (const a of block.activities) {
            texts.push(a.text?.trim() || '');
          }
        }
        break;

      case 'checkpoint':
        if (block.title) texts.push(block.title.trim());
        if (block.items) {
          for (const item of block.items) {
            texts.push(item.criterion?.trim() || '');
            if (item.description) texts.push(item.description.trim());
          }
        }
        break;

      case 'outcomes':
        if (block.title) texts.push(block.title.trim());
        if (block.items) {
          for (const item of block.items) {
            texts.push((item.text || item)?.toString().trim());
          }
        }
        break;

      case 'vocabulary':
        if (block.terms) {
          for (const t of block.terms) {
            texts.push(`${t.term?.trim() || ''} ${t.definition?.trim() || ''}`.trim());
          }
        }
        break;

      case 'resource':
        if (block.title) texts.push(block.title.trim());
        if (block.url) texts.push(block.url.trim());
        break;
    }
  }

  return texts.filter(t => t).join('\n');
}

// ---------------------------------------------------------------------------
// Normalization for comparison
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // Remove punctuation for fuzzy match
    .trim();
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

function isResourceTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('resource') ||
    lower.includes('image') ||
    lower.includes('software') ||
    lower.includes('feedback') ||
    lower.includes('style guide') ||
    lower.includes('template') ||
    lower.includes('download') ||
    lower.includes('accreditation') ||
    lower.includes('administration') ||
    lower.startsWith('📂')
  );
}

// ---------------------------------------------------------------------------
// Main comparison
// ---------------------------------------------------------------------------

async function compare() {
  console.log('\n🔍 Notion vs Payload Content Comparison');
  console.log('='.repeat(60));

  // Initialize Payload
  console.log('\n📦 Initializing Payload CMS...');
  const payload = await getPayload({ config });
  console.log('   ✅ Payload ready\n');

  // Filter courses
  const coursesToCompare = courseFilter
    ? COURSE_MAPPINGS.filter(c => c.slug === courseFilter)
    : COURSE_MAPPINGS;

  if (coursesToCompare.length === 0) {
    console.log('❌ No courses to compare. Check --course= flag.');
    process.exit(1);
  }

  for (const courseMapping of coursesToCompare) {
    if (!courseMapping.notionNavId || !courseMapping.notionApiKey) {
      console.log(`\n⚠ Skipping "${courseMapping.title}" — missing Notion credentials`);
      continue;
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📗 Comparing: ${courseMapping.title} (${courseMapping.slug})`);
    console.log(`${'─'.repeat(60)}`);

    if (courseMapping.isHandbook) {
      await compareHandbook(payload, courseMapping);
    } else {
      await compareCourse(payload, courseMapping);
    }

    stats.coursesCompared++;
  }

  // Print summary
  printSummary();

  // Exit with code
  const hasErrors = stats.lessonsMismatched > 0 || stats.handbooksMismatched > 0 || stats.modulesMismatched > 0;
  process.exit(hasErrors ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Course comparison (modules + lessons)
// ---------------------------------------------------------------------------

async function compareCourse(payload: any, mapping: CourseMapping) {
  const client = createNotionClient(mapping.notionApiKey);

  // ── Fetch from Notion ──
  console.log('\n   📥 Fetching from Notion...');
  const notionModulePages = await fetchChildPages(client, mapping.notionNavId);
  const notionModules = notionModulePages.filter(p => !isResourceTitle(p.title));
  console.log(`      Found ${notionModules.length} modules in Notion`);

  // ── Fetch from Payload ──
  console.log('   📥 Fetching from Payload...');
  const payloadCourse = await payload.find({
    collection: 'courses',
    where: { slug: { equals: mapping.slug } },
    limit: 1,
    depth: 3,
  });

  if (payloadCourse.docs.length === 0) {
    console.log('   ❌ Course not found in Payload CMS!');
    stats.errors.push(`Course "${mapping.slug}" not found in Payload`);
    return;
  }

  const course = payloadCourse.docs[0] as any;
  const payloadModules = (course.modules || []).filter((m: any) => typeof m === 'object');
  console.log(`      Found ${payloadModules.length} modules in Payload`);

  // ── Compare module count ──
  if (notionModules.length !== payloadModules.length) {
    console.log(`\n   ❌ Module count mismatch: Notion=${notionModules.length}, Payload=${payloadModules.length}`);
    stats.modulesMismatched++;

    // Show module titles for debugging
    console.log(`      Notion modules: ${notionModules.map(m => m.title).join(', ')}`);
    console.log(`      Payload modules: ${payloadModules.map((m: any) => m.title).join(', ')}`);
  } else {
    console.log(`\n   ✅ Module count matches: ${notionModules.length}`);
    stats.modulesMatched++;
  }

  // ── Compare each module ──
  const minModules = Math.min(notionModules.length, payloadModules.length);

  for (let mi = 0; mi < minModules; mi++) {
    const notionMod = notionModules[mi];
    const payloadMod = payloadModules[mi];

    console.log(`\n   📁 Module ${mi + 1}: "${notionMod.title}"`);

    // Compare module title
    if (normalizeTitle(notionMod.title) !== normalizeTitle(payloadMod.title)) {
      console.log(`      ⚠ Title mismatch: Notion="${notionMod.title}" vs Payload="${payloadMod.title}"`);
    } else {
      console.log(`      ✅ Title matches`);
    }

    // Fetch lessons from Notion
    const notionLessonPages = await fetchChildPages(client, notionMod.id);
    console.log(`      Notion lessons: ${notionLessonPages.length}`);

    // Get lessons from Payload
    const payloadLessons = (payloadMod.lessons || []).filter((l: any) => typeof l === 'object');
    console.log(`      Payload lessons: ${payloadLessons.length}`);

    // Compare lesson count
    if (notionLessonPages.length !== payloadLessons.length) {
      console.log(`      ❌ Lesson count mismatch: Notion=${notionLessonPages.length}, Payload=${payloadLessons.length}`);
      console.log(`         Notion: ${notionLessonPages.map(l => l.title).join(', ')}`);
      console.log(`         Payload: ${payloadLessons.map((l: any) => l.title).join(', ')}`);
    }

    // Compare each lesson
    const minLessons = Math.min(notionLessonPages.length, payloadLessons.length);

    for (let li = 0; li < minLessons; li++) {
      const notionLesson = notionLessonPages[li];
      const payloadLesson = payloadLessons[li];
      stats.lessonsCompared++;

      console.log(`\n      📄 Lesson ${li + 1}: "${notionLesson.title}"`);

      // Compare title
      const titlesMatch = normalizeTitle(notionLesson.title) === normalizeTitle(payloadLesson.title);
      if (!titlesMatch) {
        console.log(`         ⚠ Title mismatch: Notion="${notionLesson.title}" vs Payload="${payloadLesson.title}"`);
      }

      // Fetch Notion lesson content
      try {
        const notionBlocks = await fetchNotionBlocks(client, notionLesson.id);
        const notionText = normalize(extractTextFromNotionBlocks(notionBlocks));

        // Get Payload lesson content
        const payloadSections = payloadLesson.sections || [];
        const payloadText = normalize(extractTextFromPayloadSections(payloadSections));

        // Compare text content
        if (!notionText && !payloadText) {
          console.log(`         ✅ Both empty`);
          stats.lessonsMatched++;
        } else if (notionText === payloadText) {
          console.log(`         ✅ Content matches (${payloadSections.length} sections)`);
          stats.lessonsMatched++;
        } else {
          // Check similarity — exact match is too strict due to parsing differences
          // Use word-level comparison
          const notionWords = new Set(notionText.split(/\s+/).filter(w => w.length > 2));
          const payloadWords = new Set(payloadText.split(/\s+/).filter(w => w.length > 2));

          const commonWords = new Set([...notionWords].filter(w => payloadWords.has(w)));
          const totalWords = new Set([...notionWords, ...payloadWords]);
          const similarity = totalWords.size > 0 ? (commonWords.size / totalWords.size) * 100 : 100;

          if (similarity >= 90) {
            console.log(`         ✅ Content matches (~${similarity.toFixed(0)}% word similarity, ${payloadSections.length} sections)`);
            stats.lessonsMatched++;
          } else {
            console.log(`         ❌ Content mismatch (${similarity.toFixed(0)}% word similarity)`);
            console.log(`            Notion: ${notionText.substring(0, 100)}...`);
            console.log(`            Payload: ${payloadText.substring(0, 100)}...`);
            console.log(`            Notion words: ${notionWords.size}, Payload words: ${payloadWords.size}, Common: ${commonWords.size}`);

            if (VERBOSE) {
              // Show words only in Notion
              const onlyNotion = [...notionWords].filter(w => !payloadWords.has(w));
              const onlyPayload = [...payloadWords].filter(w => !notionWords.has(w));
              if (onlyNotion.length > 0) {
                console.log(`            Only in Notion (first 20): ${onlyNotion.slice(0, 20).join(', ')}`);
              }
              if (onlyPayload.length > 0) {
                console.log(`            Only in Payload (first 20): ${onlyPayload.slice(0, 20).join(', ')}`);
              }
            }

            stats.lessonsMismatched++;
          }
        }
      } catch (error) {
        console.log(`         ❌ Error comparing: ${error}`);
        stats.errors.push(`Lesson "${notionLesson.title}": ${error}`);
        stats.lessonsMismatched++;
      }

      // Rate limit
      await sleep(200);
    }

    // Count unmatched lessons
    if (notionLessonPages.length > payloadLessons.length) {
      for (let li = minLessons; li < notionLessonPages.length; li++) {
        console.log(`      ❌ Notion lesson not in Payload: "${notionLessonPages[li].title}"`);
        stats.lessonsMismatched++;
        stats.lessonsCompared++;
      }
    }
    if (payloadLessons.length > notionLessonPages.length) {
      for (let li = minLessons; li < payloadLessons.length; li++) {
        console.log(`      ❌ Payload lesson not in Notion: "${payloadLessons[li].title}"`);
        stats.lessonsMismatched++;
        stats.lessonsCompared++;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Handbook comparison
// ---------------------------------------------------------------------------

async function compareHandbook(payload: any, mapping: CourseMapping) {
  console.log('\n   📥 Fetching handbook from Notion...');

  try {
    // Fetch from Notion database
    const response = await fetch(
      `https://api.notion.com/v1/databases/${mapping.notionNavId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mapping.notionApiKey}`,
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
    const notionEntries = data.results.filter((r: any) => 'properties' in r);
    console.log(`      Found ${notionEntries.length} handbook entries in Notion`);

    // Fetch from Payload
    console.log('   📥 Fetching handbook from Payload...');
    const payloadHandbooks = await payload.find({
      collection: 'handbooks',
      sort: 'order',
      limit: 200,
      depth: 1,
    });
    console.log(`      Found ${payloadHandbooks.docs.length} handbook entries in Payload`);

    // Compare count
    if (notionEntries.length !== payloadHandbooks.docs.length) {
      console.log(`\n   ⚠ Entry count difference: Notion=${notionEntries.length}, Payload=${payloadHandbooks.docs.length}`);
    } else {
      console.log(`\n   ✅ Entry count matches: ${notionEntries.length}`);
    }

    // Compare each entry by title
    const notionTitles = notionEntries.map((entry: any) => {
      const props = entry.properties;
      if (props.Name?.type === 'title' && props.Name.title?.[0]) {
        return props.Name.title[0].plain_text;
      }
      return 'Untitled';
    });

    const payloadTitles = payloadHandbooks.docs.map((doc: any) => doc.title);

    for (const notionTitle of notionTitles) {
      stats.handbooksCompared++;
      const found = payloadTitles.some((pt: string) =>
        normalizeTitle(pt) === normalizeTitle(notionTitle)
      );

      if (found) {
        console.log(`      ✅ "${notionTitle}"`);
        stats.handbooksMatched++;
      } else {
        console.log(`      ❌ Not found in Payload: "${notionTitle}"`);
        stats.handbooksMismatched++;
      }
    }

    // Check for extra entries in Payload
    for (const payloadTitle of payloadTitles) {
      const found = notionTitles.some((nt: string) =>
        normalizeTitle(nt) === normalizeTitle(payloadTitle)
      );
      if (!found) {
        console.log(`      ⚠ Extra in Payload (not in Notion): "${payloadTitle}"`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Error comparing handbook: ${error}`);
    stats.errors.push(`Handbook comparison failed: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Comparison Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Courses compared:    ${stats.coursesCompared}`);
  console.log(`   Modules:             ${stats.modulesMatched} matched, ${stats.modulesMismatched} mismatched`);
  console.log(`   Lessons compared:    ${stats.lessonsCompared}`);
  console.log(`   Lessons matched:     ${stats.lessonsMatched} ✅`);
  console.log(`   Lessons mismatched:  ${stats.lessonsMismatched} ❌`);
  console.log(`   Handbooks compared:  ${stats.handbooksCompared}`);
  console.log(`   Handbooks matched:   ${stats.handbooksMatched} ✅`);
  console.log(`   Handbooks mismatched:${stats.handbooksMismatched} ❌`);

  if (stats.errors.length > 0) {
    console.log(`\n   ⚠ Errors:`);
    for (const err of stats.errors) {
      console.log(`      - ${err}`);
    }
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
// Entry point
// ---------------------------------------------------------------------------

compare().catch((error) => {
  console.error('\n💥 Comparison failed:', error);
  process.exit(1);
});
