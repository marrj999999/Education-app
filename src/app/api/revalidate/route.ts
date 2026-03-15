import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Secret token for webhook verification (set in .env.local)
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

// Cache tag constants for ISR revalidation
const CACHE_TAGS = {
  courseStructure: 'course-structure',
  lesson: 'lesson',
  page: 'page',
} as const;

// Type for webhook payload (CMS or manual trigger)
interface WebhookBody {
  verification_token?: string;
  page_id?: string;
  event_type?: string;
  // Granular invalidation
  lesson_id?: string;
  module_id?: string;
  course_id?: string;
}

// Helper to revalidate a tag with the default cache profile
function invalidateTag(tag: string) {
  revalidateTag(tag, 'default');
}

/**
 * POST /api/revalidate
 *
 * Endpoint for CMS webhooks or manual cache revalidation.
 *
 * Query params:
 * - secret: Required authentication token
 * - tag: Cache tag to revalidate (course-structure, lesson, page)
 * - path: Specific path to revalidate (e.g., /lessons/abc123)
 *
 * Body (from CMS webhook):
 * - page_id: The page that was updated
 * - event_type: Type of change (created, updated, deleted, etc.)
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  const tag = searchParams.get('tag');
  const path = searchParams.get('path');

  // SECURITY: Always require secret token - reject if not configured or invalid
  if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Parse webhook payload if present
    let body: WebhookBody = {};
    try {
      body = await request.json() as WebhookBody;
    } catch {
      // No body or invalid JSON - that's okay for manual revalidation
    }

    const revalidated: string[] = [];

    // Handle webhook verification
    if (body.verification_token) {
      return NextResponse.json({
        success: true,
        message: 'Webhook verified',
      });
    }

    // Revalidate by tag if specified
    if (tag) {
      invalidateTag(tag);
      revalidated.push(`tag:${tag}`);
    }

    // Revalidate by path if specified
    if (path) {
      revalidatePath(path);
      revalidated.push(`path:${path}`);
    }

    // Handle granular lesson-specific invalidation
    if (body.lesson_id) {
      // Revalidate specific lesson by ID
      const lessonTag = `lesson-${body.lesson_id}`;
      invalidateTag(lessonTag);
      revalidatePath(`/lessons/${body.lesson_id}`);
      revalidated.push(`tag:${lessonTag}`, `path:/lessons/${body.lesson_id}`);
    }

    // Handle granular module-specific invalidation
    if (body.module_id) {
      const moduleTag = `module-${body.module_id}`;
      invalidateTag(moduleTag);
      revalidated.push(`tag:${moduleTag}`);
    }

    // Handle granular course-specific invalidation
    if (body.course_id) {
      const courseTag = `course-${body.course_id}`;
      invalidateTag(courseTag);
      revalidatePath(`/courses/${body.course_id}`);
      revalidated.push(`tag:${courseTag}`, `path:/courses/${body.course_id}`);
    }

    // Handle legacy page_id support
    if (body.page_id) {
      // Revalidate the specific lesson page
      revalidatePath(`/lessons/${body.page_id}`);
      revalidated.push(`path:/lessons/${body.page_id}`);

      // Revalidate lesson-specific tag if it exists
      const lessonTag = `lesson-${body.page_id}`;
      invalidateTag(lessonTag);
      revalidated.push(`tag:${lessonTag}`);

      // Also revalidate general cache tags
      invalidateTag(CACHE_TAGS.lesson);
      invalidateTag(CACHE_TAGS.page);
      revalidated.push(`tag:${CACHE_TAGS.lesson}`, `tag:${CACHE_TAGS.page}`);

      // If it's a structural change, revalidate course structure too
      if (body.event_type?.includes('created') ||
          body.event_type?.includes('deleted') ||
          body.event_type?.includes('moved')) {
        invalidateTag(CACHE_TAGS.courseStructure);
        revalidatePath('/');
        revalidated.push(`tag:${CACHE_TAGS.courseStructure}`, 'path:/');
      }
    }

    // If no specific revalidation requested, revalidate everything
    if (revalidated.length === 0) {
      invalidateTag(CACHE_TAGS.courseStructure);
      invalidateTag(CACHE_TAGS.lesson);
      invalidateTag(CACHE_TAGS.page);
      revalidatePath('/');
      revalidated.push('all');
    }

    return NextResponse.json({
      success: true,
      revalidated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revalidate
 *
 * Simple endpoint to manually trigger revalidation.
 * Useful for testing or manual refresh buttons.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');

  // SECURITY: Always require secret token - reject if not configured or invalid
  if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Revalidate all cache tags
    invalidateTag(CACHE_TAGS.courseStructure);
    invalidateTag(CACHE_TAGS.lesson);
    invalidateTag(CACHE_TAGS.page);
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'All caches revalidated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
