const { Client } = require('@notionhq/client');
const fs = require('fs');

// Load env
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

const notion = new Client({ auth: env.NOTION_API_KEY });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching course structure from Notion...\n');

  // Get top-level children of the course nav page
  const response = await notion.blocks.children.list({
    block_id: env.NOTION_COURSE_NAV_ID,
    page_size: 100,
  });

  console.log('Top-level blocks:', response.results.length);
  let totalLessons = 0;

  for (const block of response.results) {
    if (block.type === 'child_page') {
      console.log('\n  📁 Module:', block.child_page.title);

      await sleep(200);

      // Get lesson pages under this module
      const lessons = await notion.blocks.children.list({
        block_id: block.id,
        page_size: 100,
      });

      const lessonPages = lessons.results.filter(l => l.type === 'child_page');
      console.log('     Lessons:', lessonPages.length);
      totalLessons += lessonPages.length;

      for (const lp of lessonPages) {
        if (lp.type === 'child_page') {
          console.log('       -', lp.child_page.title);
        }
      }
    } else if (block.type === 'link_to_page') {
      console.log('  🔗 Link to page:', block.id);
    } else {
      console.log('  📄 Other:', block.type);
    }
  }

  console.log('\n---');
  console.log('Total lessons:', totalLessons);

  // Also check a single lesson to see its block structure
  console.log('\n\nChecking first lesson content structure...');
  const firstModuleBlocks = await notion.blocks.children.list({
    block_id: response.results.find(b => b.type === 'child_page').id,
    page_size: 100,
  });

  const firstLesson = firstModuleBlocks.results.find(b => b.type === 'child_page');
  if (firstLesson) {
    console.log('Lesson:', firstLesson.child_page.title);

    await sleep(200);

    const lessonBlocks = await notion.blocks.children.list({
      block_id: firstLesson.id,
      page_size: 100,
    });

    console.log('Block types in first lesson:');
    const typeCounts = {};
    for (const block of lessonBlocks.results) {
      typeCounts[block.type] = (typeCounts[block.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`  ${type}: ${count}`);
    }
  }
}

main().catch(e => console.error('Error:', e.message));
