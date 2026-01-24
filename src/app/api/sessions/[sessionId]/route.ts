import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Helper to authorize session access via cohort
async function authorizeSessionAccess(
  session: { user: { id: string; role: string } } | null,
  sessionId: string
): Promise<{ authorized: boolean; error?: string; status?: number; cohortId?: string }> {
  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // Get the session and its cohort
  const deliverySession = await prisma.sessionDelivery.findUnique({
    where: { id: sessionId },
    select: { cohortId: true }
  });

  if (!deliverySession) {
    return { authorized: false, error: 'Session not found', status: 404 };
  }

  if (['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return { authorized: true, cohortId: deliverySession.cohortId };
  }

  if (session.user.role === 'INSTRUCTOR') {
    const assignment = await prisma.cohortInstructor.findUnique({
      where: {
        cohortId_userId: {
          cohortId: deliverySession.cohortId,
          userId: session.user.id
        }
      }
    });
    if (!assignment) {
      return { authorized: false, error: 'Not assigned to this cohort', status: 403 };
    }
    return { authorized: true, cohortId: deliverySession.cohortId };
  }

  return { authorized: false, error: 'Forbidden', status: 403 };
}

// Validation schema for updating session
const updateSessionSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  actualStart: z.string().datetime().optional().nullable(),
  actualEnd: z.string().datetime().optional().nullable(),
  notes: z.string().optional()
});

/**
 * GET /api/sessions/[sessionId]
 *
 * Get full session details including lesson content, attendance, and progress.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await auth();
  const authResult = await authorizeSessionAccess(session, sessionId);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const deliverySession = await prisma.sessionDelivery.findUnique({
    where: { id: sessionId },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
          code: true,
          course: { select: { id: true, title: true, slug: true } }
        }
      },
      lesson: {
        include: {
          blocks: {
            orderBy: { sortOrder: 'asc' }
          },
          module: {
            select: { id: true, title: true, weekNumber: true }
          }
        }
      },
      attendance: {
        include: {
          learner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true
            }
          }
        }
      },
      checklistProgress: true,
      timerLogs: {
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  if (!deliverySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get all learners in cohort (not just those with attendance records)
  const allLearners = await prisma.learner.findMany({
    where: {
      cohortId: deliverySession.cohortId,
      status: { in: ['ENROLLED', 'ACTIVE'] }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  // Merge attendance with all learners
  const attendanceMap = new Map(
    deliverySession.attendance.map(a => [a.learnerId, a])
  );

  const learnerAttendance = allLearners.map(learner => ({
    learner,
    attendance: attendanceMap.get(learner.id) || null
  }));

  // Group checklist progress by block
  const checklistByBlock = deliverySession.checklistProgress.reduce((acc, cp) => {
    if (!acc[cp.blockId]) {
      acc[cp.blockId] = [];
    }
    acc[cp.blockId].push({
      itemIndex: cp.itemIndex,
      completed: cp.completed,
      completedBy: cp.completedBy
    });
    return acc;
  }, {} as Record<string, { itemIndex: number; completed: boolean; completedBy: string | null }[]>);

  // Get latest timer state per block
  const timerStateByBlock = deliverySession.timerLogs.reduce((acc, log) => {
    if (!acc[log.blockId]) {
      acc[log.blockId] = {
        lastAction: log.action,
        elapsedSeconds: log.elapsedSeconds,
        timestamp: log.timestamp
      };
    }
    return acc;
  }, {} as Record<string, { lastAction: string; elapsedSeconds: number | null; timestamp: Date }>);

  return NextResponse.json({
    ...deliverySession,
    learnerAttendance,
    checklistByBlock,
    timerStateByBlock
  });
}

/**
 * PATCH /api/sessions/[sessionId]
 *
 * Update session details (status, times, etc).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await auth();
  const authResult = await authorizeSessionAccess(session, sessionId);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = updateSessionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const updateData: {
    scheduledDate?: Date;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    actualStart?: Date | null;
    actualEnd?: Date | null;
    notes?: string;
  } = {};

  if (validation.data.scheduledDate) {
    updateData.scheduledDate = new Date(validation.data.scheduledDate);
  }

  if (validation.data.status) {
    updateData.status = validation.data.status;

    // Auto-set times based on status
    if (validation.data.status === 'IN_PROGRESS' && !validation.data.actualStart) {
      updateData.actualStart = new Date();
    }
    if (validation.data.status === 'COMPLETED' && !validation.data.actualEnd) {
      updateData.actualEnd = new Date();
    }
  }

  if (validation.data.actualStart !== undefined) {
    updateData.actualStart = validation.data.actualStart ? new Date(validation.data.actualStart) : null;
  }

  if (validation.data.actualEnd !== undefined) {
    updateData.actualEnd = validation.data.actualEnd ? new Date(validation.data.actualEnd) : null;
  }

  if (validation.data.notes !== undefined) {
    updateData.notes = validation.data.notes;
  }

  const updatedSession = await prisma.sessionDelivery.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      lesson: { select: { id: true, title: true } },
      cohort: { select: { id: true, name: true } }
    }
  });

  // Audit log for status changes
  if (validation.data.status) {
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: `SESSION_${validation.data.status}`,
        entity: 'SESSION',
        entityId: sessionId,
        details: {
          cohortId: authResult.cohortId,
          lessonId: updatedSession.lessonId,
          lessonTitle: updatedSession.lesson.title
        }
      }
    });
  }

  return NextResponse.json(updatedSession);
}
