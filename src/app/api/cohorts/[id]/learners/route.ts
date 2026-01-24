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

// Validation schema for adding learners
const addLearnerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  ocnLearnerId: z.string().optional(),
  notes: z.string().optional()
});

/**
 * GET /api/cohorts/[id]/learners
 *
 * List learners in a cohort with attendance and assessment progress.
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

  const learners = await prisma.learner.findMany({
    where: { cohortId: id },
    include: {
      attendance: {
        include: { session: { select: { scheduledDate: true, status: true } } }
      },
      assessments: {
        select: { criterionCode: true, status: true }
      }
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  // Calculate attendance rate and assessment progress for each learner
  const enrichedLearners = learners.map(learner => {
    // Calculate attendance rate
    const completedSessions = learner.attendance.filter(a =>
      a.session.status === 'COMPLETED'
    );
    const presentCount = completedSessions.filter(a =>
      ['PRESENT', 'LATE'].includes(a.status)
    ).length;
    const attendanceRate = completedSessions.length > 0
      ? Math.round((presentCount / completedSessions.length) * 100)
      : null;

    // Calculate assessment progress
    const totalCriteria = learner.assessments.length;
    const signedOff = learner.assessments.filter(a =>
      ['SIGNED_OFF', 'VERIFIED'].includes(a.status)
    ).length;
    const assessmentProgress = totalCriteria > 0
      ? Math.round((signedOff / totalCriteria) * 100)
      : null;

    return {
      ...learner,
      attendanceRate,
      assessmentProgress,
      attendanceCount: {
        present: learner.attendance.filter(a => a.status === 'PRESENT').length,
        late: learner.attendance.filter(a => a.status === 'LATE').length,
        absent: learner.attendance.filter(a => a.status === 'ABSENT').length,
        excused: learner.attendance.filter(a => a.status === 'EXCUSED').length
      },
      assessmentCount: {
        total: totalCriteria,
        signedOff,
        inProgress: learner.assessments.filter(a => a.status === 'IN_PROGRESS').length,
        requiresRevision: learner.assessments.filter(a => a.status === 'REQUIRES_REVISION').length
      }
    };
  });

  return NextResponse.json(enrichedLearners);
}

/**
 * POST /api/cohorts/[id]/learners
 *
 * Add a learner to the cohort.
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

  const validation = addLearnerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  // Check cohort exists and capacity
  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: { _count: { select: { learners: true } } }
  });

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  if (cohort._count.learners >= cohort.maxLearners) {
    return NextResponse.json({ error: 'Cohort is at capacity' }, { status: 400 });
  }

  // Check for duplicate email in cohort
  const existingLearner = await prisma.learner.findUnique({
    where: {
      cohortId_email: { cohortId: id, email: validation.data.email }
    }
  });

  if (existingLearner) {
    return NextResponse.json({ error: 'Learner with this email already exists in cohort' }, { status: 400 });
  }

  const learner = await prisma.learner.create({
    data: {
      ...validation.data,
      cohortId: id
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: 'LEARNER_ADDED',
      entity: 'LEARNER',
      entityId: learner.id,
      details: { cohortId: id, email: learner.email }
    }
  });

  return NextResponse.json(learner, { status: 201 });
}
