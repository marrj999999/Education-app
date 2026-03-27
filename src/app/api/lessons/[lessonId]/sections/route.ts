import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getPayloadLessonContent } from '@/lib/payload/queries';
import { applyCustomSectionOrder } from '@/lib/section-ordering';
import { getSessionFromRequest } from '@/lib/auth-cookie';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    lessonId: string;
  }>;
}

// =============================================================================
// GET — fetch lesson sections (existing)
// =============================================================================

export async function GET(request: Request, { params }: RouteParams) {
  const { lessonId } = await params;

  try {
    const lessonData = await getPayloadLessonContent(lessonId);

    if (!lessonData) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const { page, sections } = lessonData;

    // Apply custom section order if one exists
    const orderedSections = await applyCustomSectionOrder(lessonId, sections);

    return NextResponse.json({
      page: {
        title: page.title,
        icon: page.icon,
      },
      sections: orderedSections,
    });
  } catch (error) {
    console.error('Failed to fetch lesson sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH — update lesson sections (inline editing)
// =============================================================================

/**
 * PATCH /api/lessons/[lessonId]/sections
 *
 * Updates lesson content sections in Payload CMS.
 * Accepts field-level changes and/or reordering.
 * Only accessible to authenticated admin/super-admin users.
 *
 * Body:
 * {
 *   changes?: Record<sectionId, Record<field, value>>  // field edits
 *   order?: string[]                                    // new section order
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { lessonId } = await params;

  // Authenticate — admin only
  const session = getSessionFromRequest(request);
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
    return NextResponse.json(
      { error: 'Unauthorized — admin access required' },
      { status: 401 },
    );
  }

  // Parse body
  let body: {
    changes?: Record<string, Record<string, unknown>>;
    order?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { changes, order } = body;

  if (!changes && !order) {
    return NextResponse.json(
      { error: 'No changes or order provided' },
      { status: 400 },
    );
  }

  try {
    const payload = await getPayload({ config });

    // Convert string ID to number (Payload uses serial/integer IDs)
    const numericId = Number(lessonId);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid lesson ID' }, { status: 400 });
    }

    // Fetch the current lesson with its sections
    const lesson = await payload.findByID({
      collection: 'lessons',
      id: numericId,
      depth: 0,
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 },
      );
    }

    const currentSections = (lesson as any).sections as any[];
    if (!currentSections || !Array.isArray(currentSections)) {
      return NextResponse.json(
        { error: 'Lesson has no sections' },
        { status: 400 },
      );
    }

    let updatedSections = [...currentSections];

    // Apply field-level changes
    if (changes) {
      for (const [sectionId, fieldChanges] of Object.entries(changes)) {
        const sectionIndex = updatedSections.findIndex(
          (s: any) => String(s.id) === String(sectionId),
        );
        if (sectionIndex === -1) {
          console.warn(
            `[sections-api] Section ${sectionId} not found, skipping`,
          );
          continue;
        }

        const section = JSON.parse(JSON.stringify(updatedSections[sectionIndex]));

        for (const [field, value] of Object.entries(fieldChanges)) {
          // Handle array notation: "tips[2]" or "items[0].text"
          const arrayMatch = field.match(/^(\w+)\[(\d+)\](?:\.(\w+))?$/);

          if (arrayMatch) {
            // Array item update
            const [, arrayField, indexStr, subField] = arrayMatch;
            const index = parseInt(indexStr, 10);

            if (Array.isArray(section[arrayField]) && index < section[arrayField].length) {
              if (subField) {
                // Nested: items[0].text → section.items[0].text = value
                if (typeof section[arrayField][index] === 'object') {
                  section[arrayField][index] = {
                    ...section[arrayField][index],
                    [subField]: value,
                  };
                }
              } else {
                // Simple array: tips[2] → section.tips[2] = value
                // For simple string arrays, items are objects with { text: value }
                if (typeof section[arrayField][index] === 'object' && section[arrayField][index].text !== undefined) {
                  section[arrayField][index] = { ...section[arrayField][index], text: value };
                } else {
                  section[arrayField][index] = value;
                }
              }
            }
          } else if (field === '_lessonTitle') {
            // Special case: lesson title update (handled after sections)
            // Store for later processing
            (section as any).__lessonTitle = value;
          } else {
            // Simple field update
            if (section.blockType === 'prose' && field === 'content') {
              section.content = createLexicalParagraph(value as string);
            } else {
              section[field] = value;
            }
          }
        }

        // Extract lesson title if present
        if ((section as any).__lessonTitle) {
          (body as any).__lessonTitle = (section as any).__lessonTitle;
          delete (section as any).__lessonTitle;
        }

        updatedSections[sectionIndex] = section;
      }
    }

    // Apply reordering
    if (order && Array.isArray(order)) {
      const sectionMap = new Map<string, any>();
      for (const section of updatedSections) {
        sectionMap.set(section.id, section);
      }

      const reordered: any[] = [];
      for (const sectionId of order) {
        const section = sectionMap.get(sectionId);
        if (section) {
          reordered.push(section);
          sectionMap.delete(sectionId);
        }
      }

      // Append any sections not in the order array (safety net)
      for (const remaining of sectionMap.values()) {
        reordered.push(remaining);
      }

      // Safety check: no sections lost
      if (reordered.length !== updatedSections.length) {
        console.error(
          `[sections-api] Section count mismatch after reorder: ${reordered.length} vs ${updatedSections.length}`,
        );
        return NextResponse.json(
          { error: 'Section count mismatch after reorder' },
          { status: 500 },
        );
      }

      updatedSections = reordered;
    }

    // Build the update data
    const updateData: any = { sections: updatedSections };

    // Handle lesson title update if present
    if ((body as any).__lessonTitle) {
      updateData.title = (body as any).__lessonTitle;
    }

    // Also check for _lessonTitle in changes at the top level
    if (changes && changes['_lesson']) {
      const lessonFields = changes['_lesson'];
      if (lessonFields.title) {
        updateData.title = lessonFields.title;
      }
    }

    // Save to Payload CMS (overrideAccess bypasses Payload's own access control)
    await payload.update({
      collection: 'lessons',
      id: numericId,
      data: updateData,
      overrideAccess: true,
    });

    // Revalidate lesson pages so ISR picks up the change
    revalidatePath('/courses', 'layout');

    console.log(
      `[sections-api] Lesson ${lessonId} updated by ${session.email} — ` +
        `${changes ? Object.keys(changes).length : 0} field changes, ` +
        `${order ? 'reordered' : 'no reorder'}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('[sections-api] Failed to update lesson', lessonId, ':', error);

    // Return detailed error info for debugging
    const errorResponse: Record<string, unknown> = {
      error: `Failed to update lesson: ${message}`,
    };

    // Include Payload validation errors if present
    if (error && typeof error === 'object') {
      if ('data' in error) errorResponse.validationErrors = (error as any).data;
      if ('isOperational' in error) errorResponse.isOperational = (error as any).isOperational;
      if ('status' in error) errorResponse.payloadStatus = (error as any).status;
      if (error instanceof Error) errorResponse.stack = error.stack?.split('\n').slice(0, 5);
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a minimal Lexical rich text structure for a plain text paragraph.
 */
function createLexicalParagraph(text: string) {
  const paragraphs = text.split('\n').filter(Boolean);
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      children: paragraphs.map((paraText) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        children: [
          {
            type: 'text',
            format: 0,
            text: paraText,
            detail: 0,
            mode: 'normal' as const,
            style: '',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        textFormat: 0,
        textStyle: '',
      })),
      direction: 'ltr' as const,
    },
  };
}
