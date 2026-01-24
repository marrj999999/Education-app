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

// Validation schema for updating learners
const updateLearnerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  ocnLearnerId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ENROLLED', 'ACTIVE', 'DEFERRED', 'WITHDRAWN', 'COMPLETED', 'FAILED']).optional()
});

/**
 * GET /api/cohorts/[id]/learners/[learnerId]
 *
 * Get a single learner with full details.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; learnerId: string }> }
) {
  const { id, learnerId } = await params;
  const session = await auth();
  const authResult = await authorizeCohortAccess(session, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    include: {
      cohort: {
        select: { id: true, name: true, code: true }
      },
      attendance: {
        include: {
          session: {
            select: {
              id: true,
              scheduledDate: true,
              status: true,
              lesson: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { session: { scheduledDate: 'desc' } }
      },
      assessments: {
        orderBy: [{ lessonId: 'asc' }, { criterionCode: 'asc' }]
      }
    }
  });

  if (!learner) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  if (learner.cohortId !== id) {
    return NextResponse.json({ error: 'Learner not in this cohort' }, { status: 404 });
  }

  return NextResponse.json(learner);
}

/**
 * PATCH /api/cohorts/[id]/learners/[learnerId]
 *
 * Update learner details.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; learnerId: string }> }
) {
  const { id, learnerId } = await params;
  const session = await auth();
  const authResult = await authorizeCohortAccess(session, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Verify learner exists and belongs to cohort
  const existingLearner = await prisma.learner.findUnique({
    where: { id: learnerId }
  });

  if (!existingLearner) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  if (existingLearner.cohortId !== id) {
    return NextResponse.json({ error: 'Learner not in this cohort' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = updateLearnerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  // If email is being changed, check for duplicates
  if (validation.data.email && validation.data.email !== existingLearner.email) {
    const duplicateEmail = await prisma.learner.findUnique({
      where: {
        cohortId_email: { cohortId: id, email: validation.data.email }
      }
    });

    if (duplicateEmail) {
      return NextResponse.json(
        { error: 'Another learner with this email already exists in cohort' },
        { status: 400 }
      );
    }
  }

  const learner = await prisma.learner.update({
    where: { id: learnerId },
    data: validation.data
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: 'LEARNER_UPDATED',
      entity: 'LEARNER',
      entityId: learner.id,
      details: { cohortId: id, changes: validation.data }
    }
  });

  return NextResponse.json(learner);
}

/**
 * DELETE /api/cohorts/[id]/learners/[learnerId]
 *
 * Remove a learner from the cohort.
 * This is a soft delete - changes status to WITHDRAWN.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; learnerId: string }> }
) {
  const { id, learnerId } = await params;
  const session = await auth();
  const authResult = await authorizeCohortAccess(session, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Verify learner exists and belongs to cohort
  const existingLearner = await prisma.learner.findUnique({
    where: { id: learnerId }
  });

  if (!existingLearner) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  if (existingLearner.cohortId !== id) {
    return NextResponse.json({ error: 'Learner not in this cohort' }, { status: 404 });
  }

  // Check query param for hard delete (admin only)
  const url = new URL(request.url);
  const hardDelete = url.searchParams.get('hard') === 'true';

  if (hardDelete) {
    // Only admins can hard delete
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session!.user.role)) {
      return NextResponse.json(
        { error: 'Only admins can permanently delete learners' },
        { status: 403 }
      );
    }

    await prisma.learner.delete({
      where: { id: learnerId }
    });

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'LEARNER_DELETED',
        entity: 'LEARNER',
        entityId: learnerId,
        details: { cohortId: id, email: existingLearner.email, hardDelete: true }
      }
    });

    return NextResponse.json({ success: true, deleted: true });
  }

  // Soft delete - mark as withdrawn
  const learner = await prisma.learner.update({
    where: { id: learnerId },
    data: { status: 'WITHDRAWN' }
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: 'LEARNER_WITHDRAWN',
      entity: 'LEARNER',
      entityId: learner.id,
      details: { cohortId: id, email: learner.email }
    }
  });

  return NextResponse.json({ success: true, learner });
}
