import { Client } from '@notionhq/client';
import { parseNotionBlocks } from '../src/lib/notion/parser';
import type { NotionBlock } from '../src/lib/types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// All lesson IDs to test
const LESSONS = [
  { id: '1a44c615-3ed9-80d7-a6af-caddc7006631', name: 'Lesson 1: Workshop Safety' },
  { id: '1a44c615-3ed9-8038-82db-e1650859d0ff', name: 'Lesson 2: Structural Properties' },
  { id: '1a44c615-3ed9-80b0-959b-eec60da86c07', name: 'Lesson 3/4/5: Bamboo Craft' },
  { id: '1a54c615-3ed9-8029-8de7-fe022d5153ea', name: 'Lesson 6: Bicycle Intro' },
  { id: '1a54c615-3ed9-80f5-9f6e-ef23380e4ee8', name: 'Lesson 7: Bicycle Types' },
  { id: '1a54c615-3ed9-80bc-9d02-d0fe521b1772', name: 'Lesson 8: Bicycle Components' },
  { id: '1a54c615-3ed9-8062-9e4c-dd106634e80f', name: 'Lesson 9: Bicycle Geometry' },
  { id: '1a54c615-3ed9-80cd-9434-e327f47f8e64', name: 'Lesson 10: Company Creation' },
  { id: '1b24c615-3ed9-80fb-9e0d-dae10405cca0', name: 'Lesson 11-15: Building Frame' },
  { id: '19f4c615-3ed9-8057-aa77-caad8718d577', name: 'Lesson 16-20: Finishing' },
  { id: '19f4c615-3ed9-80d6-b6b3-cd1aa38b1074', name: 'Lesson 21-25: Components' },
  { id: '19f4c615-3ed9-8075-865d-de852559a216', name: 'Lesson 26-30: Recycling' },
];

async function fetchBlocksRecursive(blockId: string): Promise<NotionBlock[]> {
  const allBlocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ('type' in block) {
        const notionBlock = block as unknown as NotionBlock;
        allBlocks.push(notionBlock);

        if (notionBlock.has_children) {
          const children = await fetchBlocksRecursive(notionBlock.id);
          notionBlock.children = children;
        }
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return allBlocks;
}

function getBlockText(block: NotionBlock): string {
  const type = block.type;
  const data = block[type as keyof NotionBlock] as Record<string, unknown> | undefined;

  if (!data) return '';

  if (data.rich_text && Array.isArray(data.rich_text)) {
    return (data.rich_text as Array<{ plain_text?: string }>)
      .map((t) => t.plain_text || '')
      .join('');
  }

  return '';
}

interface Analysis {
  teachingApproach: number;
  differentiation: number;
  keyScript: number;
  bulletItems: number;
  todoItems: number;
  tables: number;
  videos: number;
  files: number;
}

function analyzeBlocks(blocks: NotionBlock[]): Analysis {
  const analysis: Analysis = {
    teachingApproach: 0,
    differentiation: 0,
    keyScript: 0,
    bulletItems: 0,
    todoItems: 0,
    tables: 0,
    videos: 0,
    files: 0,
  };

  function scan(blocks: NotionBlock[]) {
    for (const block of blocks) {
      const text = getBlockText(block).toLowerCase();

      if (text.includes('teaching approach')) analysis.teachingApproach++;
      if (text.includes('differentiation')) analysis.differentiation++;
      if (text.includes('key script')) analysis.keyScript++;

      if (block.type === 'bulleted_list_item') analysis.bulletItems++;
      if (block.type === 'to_do') analysis.todoItems++;
      if (block.type === 'table') analysis.tables++;
      if (block.type === 'video') analysis.videos++;
      if (block.type === 'file') analysis.files++;

      if (block.children) scan(block.children);
    }
  }

  scan(blocks);
  return analysis;
}

async function auditLesson(lesson: { id: string; name: string }) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`LESSON: ${lesson.name}`);
  console.log('─'.repeat(60));

  try {
    const blocks = await fetchBlocksRecursive(lesson.id);
    const analysis = analyzeBlocks(blocks);

    console.log('\nRaw content found:');
    console.log(`  Teaching Approach mentions: ${analysis.teachingApproach}`);
    console.log(`  Differentiation mentions: ${analysis.differentiation}`);
    console.log(`  Key Script mentions: ${analysis.keyScript}`);
    console.log(`  Bullet items: ${analysis.bulletItems}`);
    console.log(`  To-do items: ${analysis.todoItems}`);
    console.log(`  Tables: ${analysis.tables}`);
    console.log(`  Videos: ${analysis.videos}`);
    console.log(`  Files: ${analysis.files}`);

    // Parse with current parser
    const sections = parseNotionBlocks(blocks);
    const teachingSteps = sections.filter((s) => s.type === 'teaching-step');

    let capturedApproach = 0;
    let capturedDiff = 0;
    let capturedActivities = 0;
    let capturedResources = 0;

    for (const step of teachingSteps) {
      const ts = step as unknown as Record<string, unknown>;
      if (ts.teachingApproach) capturedApproach++;
      if (ts.differentiation) capturedDiff++;
      if (ts.activities && Array.isArray(ts.activities)) {
        capturedActivities += ts.activities.length;
      }
      if (ts.resources && Array.isArray(ts.resources)) {
        capturedResources += ts.resources.length;
      }
    }

    // Count top-level resources too
    const resourceSections = sections.filter((s) => s.type === 'resource');
    capturedResources += resourceSections.length;

    console.log('\n📊 PARSER RESULTS:');
    console.log(`  Total sections: ${sections.length}`);
    console.log(`  Teaching steps: ${teachingSteps.length}`);
    console.log(`  With teachingApproach: ${capturedApproach}/${analysis.teachingApproach}`);
    console.log(`  With differentiation: ${capturedDiff}/${analysis.differentiation}`);
    console.log(`  Activities captured: ${capturedActivities}/${analysis.bulletItems + analysis.todoItems}`);
    console.log(`  Resources captured: ${capturedResources}/${analysis.videos + analysis.files}`);

    // Calculate capture rate
    const activityRate =
      analysis.bulletItems + analysis.todoItems > 0
        ? Math.round((capturedActivities / (analysis.bulletItems + analysis.todoItems)) * 100)
        : 100;
    const resourceRate =
      analysis.videos + analysis.files > 0
        ? Math.round((capturedResources / (analysis.videos + analysis.files)) * 100)
        : 100;

    if (activityRate < 50 || capturedApproach < analysis.teachingApproach) {
      console.log(`\n⚠️  WARNING: Content not fully captured`);
    } else {
      console.log(`\n✅ Activities: ${activityRate}% | Resources: ${resourceRate}%`);
    }

    return {
      name: lesson.name,
      activityRate,
      resourceRate,
      teachingApproach: `${capturedApproach}/${analysis.teachingApproach}`,
      differentiation: `${capturedDiff}/${analysis.differentiation}`,
    };
  } catch (error) {
    console.log(`❌ Error: ${error}`);
    return null;
  }
}

async function auditAllLessons() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          UNIVERSAL LESSON CONTENT AUDIT                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results: Array<{
    name: string;
    activityRate: number;
    resourceRate: number;
    teachingApproach: string;
    differentiation: string;
  }> = [];

  for (const lesson of LESSONS) {
    const result = await auditLesson(lesson);
    if (result) results.push(result);
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log('\n| Lesson | Activities | Resources | Teaching | Diff |');
  console.log('|--------|------------|-----------|----------|------|');

  for (const r of results) {
    const name = r.name.substring(0, 25).padEnd(25);
    console.log(
      `| ${name} | ${r.activityRate}% | ${r.resourceRate}% | ${r.teachingApproach} | ${r.differentiation} |`
    );
  }
}

auditAllLessons().catch(console.error);
