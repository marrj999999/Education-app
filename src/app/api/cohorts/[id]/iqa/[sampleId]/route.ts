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

// Validation schema for updating IQA samples
const updateIqaSampleSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ACTION_REQUIRED']).optional(),
  findings: z.string().optional().nullable(),
  actionPoints: z.string().optional().nullable()
});

/**
 * GET /api/cohorts/[id]/iqa/[sampleId]
 *
 * Get a single IQA sample with related assessments.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; sampleId: string }> }
) {
  const { id, sampleId } = await params;
  const authSession = await auth();
  const authResult = await authorizeCohortAccess(authSession, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const sample = await prisma.iqaSample.findUnique({
    where: { id: sampleId }
  });

  if (!sample) {
    return NextResponse.json({ error: 'IQA sample not found' }, { status: 404 });
  }

  if (sample.cohortId !== id) {
    return NextResponse.json({ error: 'IQA sample not in this cohort' }, { status: 404 });
  }

  // Get learner details
  const learners = await prisma.learner.findMany({
    where: { id: { in: sample.learnersSelected } },
    select: { id: true, firstName: true, lastName: true, email: true }
  });

  // Get assessments for sampled learners and criteria
  const assessments = await prisma.assessmentSignoff.findMany({
    where: {
      learnerId: { in: sample.learnersSelected },
      criterionCode: { in: sample.criteriaSelected }
    },
    include: {
      learner: {
        select: { firstName: true, lastName: true }
      },
      lesson: {
        select: { title: true }
      }
    }
  });

  return NextResponse.json({
    ...sample,
    learners,
    assessments
  });
}

/**
 * PATCH /api/cohorts/[id]/iqa/[sampleId]
 *
 * Update an IQA sample (findings, action points, status).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sampleId: string }> }
) {
  const { id, sampleId } = await params;
  const authSession = await auth();
  const authResult = await authorizeCohortAccess(authSession, id);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Verify sample exists and belongs to cohort
  const existingSample = await prisma.iqaSample.findUnique({
    where: { id: sampleId }
  });

  if (!existingSample) {
    return NextResponse.json({ error: 'IQA sample not found' }, { status: 404 });
  }

  if (existingSample.cohortId !== id) {
    return NextResponse.json({ error: 'IQA sample not in this cohort' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = updateIqaSampleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  // Build update data
  const updateData: Record<string, unknown> = { ...validation.data };

  // If status is changing to COMPLETED, set completedAt
  if (validation.data.status === 'COMPLETED' && existingSample.status !== 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const sample = await prisma.iqaSample.update({
    where: { id: sampleId },
    data: updateData
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: authSession!.user.id,
      action: 'IQA_SAMPLE_UPDATED',
      entity: 'IQA_SAMPLE',
      entityId: sample.id,
      details: { cohortId: id, updates: Object.keys(validation.data) }
    }
  });

  return NextResponse.json(sample);
}

/**
 * DELETE /api/cohorts/[id]/iqa/[sampleId]
 *
 * Delete an IQA sample (admin only).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sampleId: string }> }
) {
  const { id, sampleId } = await params;
  const authSession = await auth();

  if (!authSession?.user || !['SUPER_ADMIN', 'ADMIN'].includes(authSession.user.role)) {
    return NextResponse.json({ error: 'Only admins can delete IQA samples' }, { status: 403 });
  }

  const existingSample = await prisma.iqaSample.findUnique({
    where: { id: sampleId }
  });

  if (!existingSample) {
    return NextResponse.json({ error: 'IQA sample not found' }, { status: 404 });
  }

  if (existingSample.cohortId !== id) {
    return NextResponse.json({ error: 'IQA sample not in this cohort' }, { status: 404 });
  }

  await prisma.iqaSample.delete({
    where: { id: sampleId }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: authSession.user.id,
      action: 'IQA_SAMPLE_DELETED',
      entity: 'IQA_SAMPLE',
      entityId: sampleId,
      details: { cohortId: id, samplePeriod: existingSample.samplePeriod }
    }
  });

  return NextResponse.json({ success: true });
}
