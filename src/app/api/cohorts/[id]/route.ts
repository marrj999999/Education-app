import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Helper to check if user is assigned to cohort
async function isUserAssignedToCohort(userId: string, cohortId: string): Promise<boolean> {
  const assignment = await prisma.cohortInstructor.findUnique({
    where: {
      cohortId_userId: { cohortId, userId }
    }
  });
  return !!assignment;
}

// Helper to authorize cohort access
async function authorizeCohortAccess(
  session: { user: { id: string; role: string } } | null,
  cohortId: string,
  requiredRoles?: string[]
): Promise<{ authorized: boolean; error?: string; status?: number }> {
  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // Admins always have access
  if (['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return { authorized: true };
  }

  // Check specific role requirements
  if (requiredRoles && !requiredRoles.includes(session.user.role)) {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  // Instructors must be assigned to the cohort
  if (session.user.role === 'INSTRUCTOR') {
    const isAssigned = await isUserAssignedToCohort(session.user.id, cohortId);
    if (!isAssigned) {
      return { authorized: false, error: 'Not assigned to this cohort', status: 403 };
    }
  }

  return { authorized: true };
}

/**
 * GET /api/cohorts/[id]
 *
 * Get cohort details with modules, lessons, learners, and sessions.
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

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      course: {
        include: {
          modules: {
            include: { lessons: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      },
      instructors: { include: { user: { select: { id: true, name: true, email: true } } } },
      learners: { orderBy: { lastName: 'asc' } },
      sessions: {
        include: { lesson: true },
        orderBy: { scheduledDate: 'asc' }
      }
    }
  });

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  return NextResponse.json(cohort);
}

// Update schema
const updateCohortSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  maxLearners: z.number().int().min(1).max(50).optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

/**
 * PATCH /api/cohorts/[id]
 *
 * Update cohort details.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const authResult = await authorizeCohortAccess(session, id, ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR']);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = updateCohortSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (updateData.startDate) {
    updateData.startDate = new Date(updateData.startDate as string);
  }
  if (updateData.endDate) {
    updateData.endDate = new Date(updateData.endDate as string);
  }

  const cohort = await prisma.cohort.update({
    where: { id },
    data: updateData,
    include: {
      course: true,
      instructors: { include: { user: true } }
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: 'COHORT_UPDATED',
      entity: 'COHORT',
      entityId: cohort.id,
      details: { updates: Object.keys(validation.data) }
    }
  });

  return NextResponse.json(cohort);
}

/**
 * DELETE /api/cohorts/[id]
 *
 * Delete a cohort. Only ADMIN and SUPER_ADMIN can delete.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Check if cohort exists
  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: { _count: { select: { learners: true } } }
  });

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  // Prevent deletion if cohort has learners
  if (cohort._count.learners > 0) {
    return NextResponse.json(
      { error: 'Cannot delete cohort with learners. Remove learners first.' },
      { status: 400 }
    );
  }

  await prisma.cohort.delete({ where: { id } });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'COHORT_DELETED',
      entity: 'COHORT',
      entityId: id,
      details: { code: cohort.code, name: cohort.name }
    }
  });

  return NextResponse.json({ success: true });
}
