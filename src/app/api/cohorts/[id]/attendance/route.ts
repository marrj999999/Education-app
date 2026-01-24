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

// Validation schema for marking attendance
const markAttendanceSchema = z.object({
  sessionId: z.string(),
  records: z.array(z.object({
    learnerId: z.string(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'PARTIAL']),
    arrivedAt: z.string().datetime().optional()
  }))
});

// Single attendance record update
const updateAttendanceSchema = z.object({
  sessionId: z.string(),
  learnerId: z.string(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'PARTIAL']),
  arrivedAt: z.string().datetime().optional()
});

/**
 * GET /api/cohorts/[id]/attendance
 *
 * Get attendance records for a cohort.
 * Optional query params:
 * - sessionId: Filter by session
 * - learnerId: Filter by learner
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const authResult = await authorizeCohortAccess(session, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const learnerId = url.searchParams.get('learnerId');

  // Build where clause
  const where: {
    session: { cohortId: string; id?: string };
    learnerId?: string;
  } = {
    session: { cohortId: id }
  };

  if (sessionId) {
    where.session.id = sessionId;
  }

  if (learnerId) {
    where.learnerId = learnerId;
  }

  const attendance = await prisma.attendance.findMany({
    where,
    include: {
      session: {
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          lesson: { select: { id: true, title: true } }
        }
      },
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      markedByUser: {
        select: { id: true, name: true }
      }
    },
    orderBy: [
      { session: { scheduledDate: 'desc' } },
      { learner: { lastName: 'asc' } }
    ]
  });

  // Calculate summary stats
  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'PRESENT').length,
    late: attendance.filter(a => a.status === 'LATE').length,
    absent: attendance.filter(a => a.status === 'ABSENT').length,
    excused: attendance.filter(a => a.status === 'EXCUSED').length,
    partial: attendance.filter(a => a.status === 'PARTIAL').length
  };

  return NextResponse.json({ records: attendance, stats });
}

/**
 * POST /api/cohorts/[id]/attendance
 *
 * Mark attendance for multiple learners in a session.
 * Can also update a single attendance record.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const authResult = await authorizeCohortAccess(session, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check if it's a bulk update or single update
  const isBulk = 'records' in body;

  if (isBulk) {
    const validation = markAttendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { sessionId, records } = validation.data;

    // Verify session belongs to cohort
    const deliverySession = await prisma.sessionDelivery.findUnique({
      where: { id: sessionId }
    });

    if (!deliverySession || deliverySession.cohortId !== id) {
      return NextResponse.json({ error: 'Session not found in this cohort' }, { status: 404 });
    }

    // Verify all learners belong to cohort
    const learnerIds = records.map(r => r.learnerId);
    const learners = await prisma.learner.findMany({
      where: { id: { in: learnerIds }, cohortId: id }
    });

    if (learners.length !== learnerIds.length) {
      return NextResponse.json({ error: 'Some learners not found in cohort' }, { status: 400 });
    }

    // Upsert attendance records
    const results = await Promise.all(
      records.map(record =>
        prisma.attendance.upsert({
          where: {
            sessionId_learnerId: {
              sessionId,
              learnerId: record.learnerId
            }
          },
          create: {
            sessionId,
            learnerId: record.learnerId,
            status: record.status,
            arrivedAt: record.arrivedAt ? new Date(record.arrivedAt) : null,
            markedBy: session!.user.id
          },
          update: {
            status: record.status,
            arrivedAt: record.arrivedAt ? new Date(record.arrivedAt) : null,
            markedBy: session!.user.id
          }
        })
      )
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'ATTENDANCE_MARKED',
        entity: 'SESSION',
        entityId: sessionId,
        details: {
          cohortId: id,
          recordCount: records.length,
          summary: {
            present: records.filter(r => r.status === 'PRESENT').length,
            late: records.filter(r => r.status === 'LATE').length,
            absent: records.filter(r => r.status === 'ABSENT').length
          }
        }
      }
    });

    return NextResponse.json({ success: true, records: results });
  } else {
    // Single update
    const validation = updateAttendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { sessionId, learnerId, status, arrivedAt } = validation.data;

    // Verify session belongs to cohort
    const deliverySession = await prisma.sessionDelivery.findUnique({
      where: { id: sessionId }
    });

    if (!deliverySession || deliverySession.cohortId !== id) {
      return NextResponse.json({ error: 'Session not found in this cohort' }, { status: 404 });
    }

    // Verify learner belongs to cohort
    const learner = await prisma.learner.findUnique({
      where: { id: learnerId }
    });

    if (!learner || learner.cohortId !== id) {
      return NextResponse.json({ error: 'Learner not found in cohort' }, { status: 404 });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_learnerId: { sessionId, learnerId }
      },
      create: {
        sessionId,
        learnerId,
        status,
        arrivedAt: arrivedAt ? new Date(arrivedAt) : null,
        markedBy: session!.user.id
      },
      update: {
        status,
        arrivedAt: arrivedAt ? new Date(arrivedAt) : null,
        markedBy: session!.user.id
      }
    });

    return NextResponse.json(attendance);
  }
}
