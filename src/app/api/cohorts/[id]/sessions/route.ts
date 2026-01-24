import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Helper to authorize cohort access
async function authorizeCohortAccess(
  session: { user: { id: string; role: string } } | null,
  cohortId: string
): Promise<{ authorized: boolean; error?: string; status?: number }> {
  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  if (['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return { authorized: true };
  }

  if (session.user.role === 'INSTRUCTOR') {
    const assignment = await prisma.cohortInstructor.findUnique({
      where: { cohortId_userId: { cohortId, userId: session.user.id } }
    });
    if (!assignment) {
      return { authorized: false, error: 'Not assigned to this cohort', status: 403 };
    }
    return { authorized: true };
  }

  return { authorized: false, error: 'Forbidden', status: 403 };
}

// Validation schema for creating sessions
const createSessionSchema = z.object({
  lessonId: z.string().min(1),
  scheduledDate: z.string().datetime(),
  scheduledTime: z.string().optional()
});

/**
 * GET /api/cohorts/[id]/sessions
 *
 * List all sessions for a cohort.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authSession = await auth();
  const authResult = await authorizeCohortAccess(authSession, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const sessions = await prisma.sessionDelivery.findMany({
    where: { cohortId: id },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          durationMins: true,
          ocnCriteria: true,
          module: {
            select: { title: true, weekNumber: true }
          }
        }
      },
      _count: {
        select: { attendance: true }
      }
    },
    orderBy: { scheduledDate: 'asc' }
  });

  return NextResponse.json(sessions);
}

/**
 * POST /api/cohorts/[id]/sessions
 *
 * Create a new session for a cohort.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authSession = await auth();
  const authResult = await authorizeCohortAccess(authSession, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = createSessionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  // Verify cohort exists
  const cohort = await prisma.cohort.findUnique({
    where: { id }
  });

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  // Verify lesson exists
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: validation.data.lessonId }
  });

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Check for duplicate session (same lesson, same date)
  const scheduledDate = new Date(validation.data.scheduledDate);
  const existingSession = await prisma.sessionDelivery.findFirst({
    where: {
      cohortId: id,
      lessonId: validation.data.lessonId,
      scheduledDate: {
        gte: new Date(scheduledDate.toISOString().split('T')[0]),
        lt: new Date(new Date(scheduledDate.toISOString().split('T')[0]).getTime() + 24 * 60 * 60 * 1000)
      }
    }
  });

  if (existingSession) {
    return NextResponse.json(
      { error: 'A session for this lesson already exists on this date' },
      { status: 400 }
    );
  }

  const session = await prisma.sessionDelivery.create({
    data: {
      cohortId: id,
      lessonId: validation.data.lessonId,
      scheduledDate,
      scheduledTime: validation.data.scheduledTime
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          durationMins: true,
          module: { select: { title: true } }
        }
      }
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: authSession!.user.id,
      action: 'SESSION_CREATED',
      entity: 'SESSION',
      entityId: session.id,
      details: { cohortId: id, lessonId: validation.data.lessonId, scheduledDate: scheduledDate.toISOString() }
    }
  });

  return NextResponse.json(session, { status: 201 });
}
