/**
 * Test Script: Course Structure Fetcher
 *
 * Run with: npx tsx scripts/test-course-structure.ts
 */

import { fetchCourseNavigationUncached } from '../src/lib/notion/fetch-course-structure';
import { getEnabledCourses } from '../src/lib/courses';

async function main() {
  console.log('🔍 Testing Course Structure Fetcher\n');
  console.log('='.repeat(60));

  const courses = getEnabledCourses();
  console.log(`\nFound ${courses.length} enabled course(s):\n`);

  for (const course of courses) {
    console.log(`📚 ${course.title} (${course.slug})`);
    console.log(`   Notion Nav ID: ${course.notionNavId}`);
    console.log('');

    try {
      console.log('   Fetching structure...');
      const structure = await fetchCourseNavigationUncached(course.slug);

      console.log(`\n   ✅ Successfully fetched!`);
      console.log(`   Total lessons: ${structure.totalLessons}`);
      console.log(`   Modules: ${structure.modules.length}`);
      console.log(`   Standalone lessons: ${structure.standaloneLessons.length}\n`);

      // Print tree structure
      console.log('   Course Structure:');
      console.log('   ─'.repeat(30));

      for (const module of structure.modules) {
        const lessonCount = module.standaloneLessons.length +
          module.units.reduce((sum, u) => sum + u.lessons.length, 0);
        console.log(`   📁 ${module.name} (${lessonCount} lessons)`);

        // Print units if any
        for (const unit of module.units) {
          console.log(`      📂 ${unit.name}`);
          for (const lesson of unit.lessons) {
            console.log(`         ${lesson.icon || '•'} ${lesson.title}`);
          }
        }

        // Print standalone lessons in module
        for (const lesson of module.standaloneLessons.slice(0, 5)) {
          console.log(`      ${lesson.icon || '•'} ${lesson.title}`);
        }

        if (module.standaloneLessons.length > 5) {
          console.log(`      ... and ${module.standaloneLessons.length - 5} more lessons`);
        }
      }

      // Print standalone lessons
      if (structure.standaloneLessons.length > 0) {
        console.log('   ─'.repeat(30));
        console.log('   📋 Standalone Pages:');
        for (const lesson of structure.standaloneLessons) {
          console.log(`      ${lesson.icon || '•'} ${lesson.title}`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ Error fetching: ${error}`);
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('✨ Test complete!\n');
}

main().catch(console.error);
