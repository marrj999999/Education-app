import { getPayload } from 'payload';
import config from '../payload.config';

async function test() {
  console.log('Initializing Payload...');
  const payload = await getPayload({ config });

  // Step 1: Fetch the lesson at depth:0
  console.log('Fetching lesson 13 at depth:0...');
  const lesson = await payload.findByID({ collection: 'lessons', id: 13, depth: 0 });
  console.log('Lesson title:', (lesson as any).title);

  const sections = (lesson as any).sections;
  console.log('Sections count:', sections?.length);

  if (!sections || sections.length === 0) {
    console.log('No sections found');
    process.exit(1);
  }

  // Show first heading
  const heading = sections.find((s: any) => s.blockType === 'heading');
  if (heading) {
    console.log('First heading id:', heading.id, 'text:', heading.text);
  }

  // Step 2: Try update with SAME data (no changes)
  console.log('\n--- Test 1: Update with same sections (no changes) ---');
  try {
    await payload.update({
      collection: 'lessons',
      id: 13,
      data: { sections },
      overrideAccess: true,
    });
    console.log('SUCCESS');
  } catch (error: any) {
    console.error('FAILED:', error.message);
    if (error.data) console.error('Validation:', JSON.stringify(error.data, null, 2));
  }

  // Step 3: Try changing a heading text
  if (heading) {
    console.log('\n--- Test 2: Change heading text ---');
    const modified = sections.map((s: any) => {
      if (s.id === heading.id) {
        return { ...s, text: heading.text + ' (test edit)' };
      }
      return s;
    });

    try {
      await payload.update({
        collection: 'lessons',
        id: 13,
        data: { sections: modified },
        overrideAccess: true,
      });
      console.log('SUCCESS: heading changed');

      // Revert
      await payload.update({
        collection: 'lessons',
        id: 13,
        data: { sections },
        overrideAccess: true,
      });
      console.log('Reverted');
    } catch (error: any) {
      console.error('FAILED:', error.message);
      if (error.data) console.error('Validation:', JSON.stringify(error.data, null, 2));
    }
  }

  process.exit(0);
}

test().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
