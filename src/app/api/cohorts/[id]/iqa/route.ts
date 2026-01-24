import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Helper to authorize cohort access (admin or assigned instructor)
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

// Validation schema for creating IQA samples
const createIqaSampleSchema = z.object({
  samplePeriod: z.string().min(1),
  learnersSelected: z.array(z.string()).min(1, 'At least one learner must be selected'),
  criteriaSelected: z.array(z.string()).min(1, 'At least one criterion must be selected')
});

/**
 * GET /api/cohorts/[id]/iqa
 *
 * List all IQA samples for a cohort.
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

  const samples = await prisma.iqaSample.findMany({
    where: { cohortId: id },
    orderBy: { sampledAt: 'desc' }
  });

  // Enrich with learner names
  const learnerIds = [...new Set(samples.flatMap(s => s.learnersSelected))];
  const learners = await prisma.learner.findMany({
    where: { id: { in: learnerIds } },
    select: { id: true, firstName: true, lastName: true }
  });

  const learnerMap = new Map(learners.map(l => [l.id, `${l.firstName} ${l.lastName}`]));

  const enrichedSamples = samples.map(sample => ({
    ...sample,
    learnerNames: sample.learnersSelected.map(id => learnerMap.get(id) || 'Unknown')
  }));

  return NextResponse.json(enrichedSamples);
}

/**
 * POST /api/cohorts/[id]/iqa
 *
 * Create a new IQA sample.
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

  const validation = createIqaSampleSchema.safeParse(body);
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

  // Verify learners exist in cohort
  const learners = await prisma.learner.findMany({
    where: {
      id: { in: validation.data.learnersSelected },
      cohortId: id
    }
  });

  if (learners.length !== validation.data.learnersSelected.length) {
    return NextResponse.json({ error: 'One or more learners not found in cohort' }, { status: 400 });
  }

  const sample = await prisma.iqaSample.create({
    data: {
      cohortId: id,
      samplePeriod: validation.data.samplePeriod,
      sampledBy: authSession!.user.id,
      learnersSelected: validation.data.learnersSelected,
      criteriaSelected: validation.data.criteriaSelected,
      status: 'PLANNED'
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: authSession!.user.id,
      action: 'IQA_SAMPLE_CREATED',
      entity: 'IQA_SAMPLE',
      entityId: sample.id,
      details: {
        cohortId: id,
        learnersCount: validation.data.learnersSelected.length,
        criteriaCount: validation.data.criteriaSelected.length
      }
    }
  });

  return NextResponse.json(sample, { status: 201 });
}
