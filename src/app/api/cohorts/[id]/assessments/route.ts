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

// Validation schema for assessment signoff
const signoffSchema = z.object({
  learnerId: z.string(),
  lessonId: z.string(),
  criterionCode: z.string(),
  criterionText: z.string(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'SIGNED_OFF', 'REQUIRES_REVISION', 'VERIFIED']),
  evidenceNotes: z.string().optional()
});

// Bulk signoff schema
const bulkSignoffSchema = z.object({
  signoffs: z.array(signoffSchema)
});

/**
 * GET /api/cohorts/[id]/assessments
 *
 * Get assessment signoffs for a cohort.
 * Optional query params:
 * - learnerId: Filter by learner
 * - lessonId: Filter by lesson
 * - status: Filter by status
 * - criterionCode: Filter by OCN criterion code
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
  const learnerId = url.searchParams.get('learnerId');
  const lessonId = url.searchParams.get('lessonId');
  const status = url.searchParams.get('status');
  const criterionCode = url.searchParams.get('criterionCode');

  // Get all learners in cohort
  const learnerIds = await prisma.learner.findMany({
    where: { cohortId: id },
    select: { id: true }
  }).then(learners => learners.map(l => l.id));

  // Build where clause
  type SignoffStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF' | 'REQUIRES_REVISION' | 'VERIFIED';
  const where: {
    learnerId: { in: string[] };
    lessonId?: string;
    status?: SignoffStatus;
    criterionCode?: string;
  } = {
    learnerId: { in: learnerIds }
  };

  if (learnerId) {
    where.learnerId = { in: [learnerId] };
  }

  if (lessonId) {
    where.lessonId = lessonId;
  }

  if (status) {
    where.status = status as SignoffStatus;
  }

  if (criterionCode) {
    where.criterionCode = criterionCode;
  }

  const assessments = await prisma.assessmentSignoff.findMany({
    where,
    include: {
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          ocnLearnerId: true
        }
      },
      lesson: {
        select: {
          id: true,
          title: true,
          module: {
            select: { id: true, title: true }
          }
        }
      },
      signedOffByUser: {
        select: { id: true, name: true }
      }
    },
    orderBy: [
      { learner: { lastName: 'asc' } },
      { lessonId: 'asc' },
      { criterionCode: 'asc' }
    ]
  });

  // Calculate progress stats
  const stats = {
    total: assessments.length,
    notStarted: assessments.filter(a => a.status === 'NOT_STARTED').length,
    inProgress: assessments.filter(a => a.status === 'IN_PROGRESS').length,
    submitted: assessments.filter(a => a.status === 'SUBMITTED').length,
    signedOff: assessments.filter(a => a.status === 'SIGNED_OFF').length,
    requiresRevision: assessments.filter(a => a.status === 'REQUIRES_REVISION').length,
    verified: assessments.filter(a => a.status === 'VERIFIED').length
  };

  // Group by learner for matrix view
  const byLearner = assessments.reduce((acc, assessment) => {
    const key = assessment.learnerId;
    if (!acc[key]) {
      acc[key] = {
        learner: assessment.learner,
        criteria: []
      };
    }
    acc[key].criteria.push({
      id: assessment.id,
      lessonId: assessment.lessonId,
      lesson: assessment.lesson,
      criterionCode: assessment.criterionCode,
      criterionText: assessment.criterionText,
      status: assessment.status,
      evidenceNotes: assessment.evidenceNotes,
      signedOffAt: assessment.signedOffAt,
      signedOffBy: assessment.signedOffByUser
    });
    return acc;
  }, {} as Record<string, { learner: typeof assessments[0]['learner']; criteria: unknown[] }>);

  return NextResponse.json({
    records: assessments,
    byLearner: Object.values(byLearner),
    stats
  });
}

/**
 * POST /api/cohorts/[id]/assessments
 *
 * Create or update assessment signoffs.
 * Supports both single and bulk operations.
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

  // Check if bulk or single
  const isBulk = 'signoffs' in body;

  if (isBulk) {
    const validation = bulkSignoffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { signoffs } = validation.data;

    // Verify all learners belong to cohort
    const learnerIds = [...new Set(signoffs.map(s => s.learnerId))];
    const learners = await prisma.learner.findMany({
      where: { id: { in: learnerIds }, cohortId: id }
    });

    if (learners.length !== learnerIds.length) {
      return NextResponse.json({ error: 'Some learners not found in cohort' }, { status: 400 });
    }

    // Upsert all signoffs
    const results = await Promise.all(
      signoffs.map(signoff =>
        prisma.assessmentSignoff.upsert({
          where: {
            learnerId_lessonId_criterionCode: {
              learnerId: signoff.learnerId,
              lessonId: signoff.lessonId,
              criterionCode: signoff.criterionCode
            }
          },
          create: {
            learnerId: signoff.learnerId,
            lessonId: signoff.lessonId,
            criterionCode: signoff.criterionCode,
            criterionText: signoff.criterionText,
            status: signoff.status,
            evidenceNotes: signoff.evidenceNotes,
            signedOffAt: ['SIGNED_OFF', 'VERIFIED'].includes(signoff.status) ? new Date() : null,
            signedOffBy: ['SIGNED_OFF', 'VERIFIED'].includes(signoff.status) ? session!.user.id : null
          },
          update: {
            status: signoff.status,
            evidenceNotes: signoff.evidenceNotes,
            signedOffAt: ['SIGNED_OFF', 'VERIFIED'].includes(signoff.status) ? new Date() : null,
            signedOffBy: ['SIGNED_OFF', 'VERIFIED'].includes(signoff.status) ? session!.user.id : null
          }
        })
      )
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'ASSESSMENTS_UPDATED',
        entity: 'COHORT',
        entityId: id,
        details: {
          count: signoffs.length,
          learnerIds,
          summary: {
            signedOff: signoffs.filter(s => s.status === 'SIGNED_OFF').length,
            verified: signoffs.filter(s => s.status === 'VERIFIED').length
          }
        }
      }
    });

    return NextResponse.json({ success: true, records: results });
  } else {
    // Single signoff
    const validation = signoffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { learnerId, lessonId, criterionCode, criterionText, status, evidenceNotes } = validation.data;

    // Verify learner belongs to cohort
    const learner = await prisma.learner.findUnique({
      where: { id: learnerId }
    });

    if (!learner || learner.cohortId !== id) {
      return NextResponse.json({ error: 'Learner not found in cohort' }, { status: 404 });
    }

    const signoff = await prisma.assessmentSignoff.upsert({
      where: {
        learnerId_lessonId_criterionCode: { learnerId, lessonId, criterionCode }
      },
      create: {
        learnerId,
        lessonId,
        criterionCode,
        criterionText,
        status,
        evidenceNotes,
        signedOffAt: ['SIGNED_OFF', 'VERIFIED'].includes(status) ? new Date() : null,
        signedOffBy: ['SIGNED_OFF', 'VERIFIED'].includes(status) ? session!.user.id : null
      },
      update: {
        status,
        evidenceNotes,
        signedOffAt: ['SIGNED_OFF', 'VERIFIED'].includes(status) ? new Date() : null,
        signedOffBy: ['SIGNED_OFF', 'VERIFIED'].includes(status) ? session!.user.id : null
      }
    });

    // Audit log for significant status changes
    if (['SIGNED_OFF', 'VERIFIED', 'REQUIRES_REVISION'].includes(status)) {
      await prisma.auditLog.create({
        data: {
          userId: session!.user.id,
          action: `ASSESSMENT_${status}`,
          entity: 'ASSESSMENT',
          entityId: signoff.id,
          details: {
            cohortId: id,
            learnerId,
            lessonId,
            criterionCode
          }
        }
      });
    }

    return NextResponse.json(signoff);
  }
}
