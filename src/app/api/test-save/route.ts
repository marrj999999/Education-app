import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export const runtime = 'nodejs';

/**
 * TEMPORARY debug endpoint. DELETE after debugging.
 * GET /api/test-save?key=<PAYLOAD_SECRET>
 *
 * Tests payload.update() on lesson 13 to see the exact error.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  const secret = (process.env.PAYLOAD_SECRET || '').replace(/\\n/g, '').trim();
  if (!key || key !== secret) {
    return NextResponse.json({ error: 'bad key' }, { status: 403 });
  }

  const results: Record<string, unknown> = {};

  try {
    const payload = await getPayload({ config });
    results.payloadInit = 'OK';

    // Fetch lesson
    const lesson = await payload.findByID({
      collection: 'lessons',
      id: 13,
      depth: 0,
    });
    results.lessonFound = true;
    results.lessonTitle = (lesson as any).title;

    const sections = (lesson as any).sections;
    results.sectionsCount = sections?.length || 0;
    results.firstSectionKeys = sections?.[0] ? Object.keys(sections[0]) : [];
    results.firstSectionBlockType = sections?.[0]?.blockType;
    results.firstSectionId = sections?.[0]?.id;
    results.firstSectionIdType = typeof sections?.[0]?.id;

    if (!sections || sections.length === 0) {
      results.error = 'No sections found';
      return NextResponse.json(results);
    }

    // Test 1: Update with SAME sections (no changes)
    try {
      await payload.update({
        collection: 'lessons',
        id: 13,
        data: { sections },
        overrideAccess: true,
      });
      results.test1_sameData = 'SUCCESS';
    } catch (e: any) {
      results.test1_sameData = 'FAILED';
      results.test1_error = e.message;
      results.test1_stack = e.stack?.split('\n').slice(0, 8);
      results.test1_data = e.data || null;
      results.test1_status = e.status || null;
      results.test1_name = e.name || null;
      // Try to serialize the full error
      try {
        results.test1_full = JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e)));
      } catch {
        results.test1_full = String(e);
      }
    }

    // Test 2: Update heading text (only if test 1 passed)
    if (results.test1_sameData === 'SUCCESS') {
      const heading = sections.find((s: any) => s.blockType === 'heading');
      if (heading) {
        const modified = sections.map((s: any) =>
          String(s.id) === String(heading.id)
            ? { ...s, text: heading.text + ' [test]' }
            : s
        );
        try {
          await payload.update({
            collection: 'lessons',
            id: 13,
            data: { sections: modified },
            overrideAccess: true,
          });
          results.test2_editHeading = 'SUCCESS';

          // Revert
          await payload.update({
            collection: 'lessons',
            id: 13,
            data: { sections },
            overrideAccess: true,
          });
          results.test2_reverted = true;
        } catch (e: any) {
          results.test2_editHeading = 'FAILED';
          results.test2_error = e.message;
          results.test2_data = e.data || null;
        }
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (e: any) {
    results.fatalError = e.message;
    results.fatalStack = e.stack?.split('\n').slice(0, 8);
    try {
      results.fatalFull = JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    } catch {
      results.fatalFull = String(e);
    }
    return NextResponse.json(results, { status: 500 });
  }
}
