import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for marking a lesson complete
const markCompleteSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseSlug: z.string().min(1, 'Course slug is required'),
  notes: z.string().optional(),
});

// Schema for marking a lesson incomplete
const markIncompleteSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
});

/**
 * GET /api/progress
 * Get all completed lessons for the current user
 * Optional query param: courseSlug to filter by course
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courseSlug = searchParams.get('courseSlug');

    // Build query
    const where: {
      userId: string;
      course?: { slug: string };
    } = {
      userId: session.user.id,
    };

    if (courseSlug) {
      where.course = { slug: courseSlug };
    }

    const progress = await prisma.lessonProgress.findMany({
      where,
      select: {
        lessonId: true,
        completedAt: true,
        notes: true,
        course: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Transform to a simpler format
    const completedLessons = progress.map((p) => ({
      lessonId: p.lessonId,
      courseSlug: p.course.slug,
      completedAt: p.completedAt.toISOString(),
      notes: p.notes,
    }));

    return NextResponse.json({
      completedLessons,
      count: completedLessons.length,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 * Mark a lesson as complete
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = markCompleteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { lessonId, courseSlug, notes } = result.data;

    // Find the course by slug
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Upsert progress (create or update)
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
      create: {
        userId: session.user.id,
        courseId: course.id,
        lessonId,
        notes,
        completedAt: new Date(),
      },
      update: {
        notes,
        completedAt: new Date(),
      },
      select: {
        id: true,
        lessonId: true,
        completedAt: true,
        notes: true,
      },
    });

    return NextResponse.json({
      success: true,
      progress: {
        lessonId: progress.lessonId,
        completedAt: progress.completedAt.toISOString(),
        notes: progress.notes,
      },
    });
  } catch (error) {
    console.error('Error marking lesson complete:', error);
    return NextResponse.json(
      { error: 'Failed to mark lesson complete' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/progress
 * Mark a lesson as incomplete (remove progress)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = markIncompleteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { lessonId } = result.data;

    // Delete progress record
    await prisma.lessonProgress.deleteMany({
      where: {
        userId: session.user.id,
        lessonId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Progress removed',
    });
  } catch (error) {
    console.error('Error removing progress:', error);
    return NextResponse.json(
      { error: 'Failed to remove progress' },
      { status: 500 }
    );
  }
}
