import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema for creating cohorts
const createCohortSchema = z.object({
  courseId: z.string().min(1),
  name: z.string().min(1).max(100),
  code: z.string().regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with dashes'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  maxLearners: z.number().int().min(1).max(50).default(12),
  location: z.string().optional(),
  notes: z.string().optional(),
  instructorIds: z.array(z.string()).min(1, 'At least one instructor is required')
});

/**
 * GET /api/cohorts
 *
 * List cohorts. Admins see all, instructors see only their assigned cohorts.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const courseId = searchParams.get('courseId');

  // Build where clause based on role
  const where: Record<string, unknown> = {};

  if (['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    // Admins see all cohorts
  } else if (session.user.role === 'INSTRUCTOR') {
    // Instructors only see their assigned cohorts
    where.instructors = {
      some: { userId: session.user.id }
    };
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (status) where.status = status;
  if (courseId) where.courseId = courseId;

  const cohorts = await prisma.cohort.findMany({
    where,
    include: {
      course: { select: { title: true, slug: true } },
      instructors: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      _count: { select: { learners: true, sessions: true } }
    },
    orderBy: { startDate: 'desc' }
  });

  return NextResponse.json(cohorts);
}

/**
 * POST /api/cohorts
 *
 * Create a new cohort. Only ADMIN and SUPER_ADMIN can create cohorts.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = createCohortSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const { instructorIds, ...cohortData } = validation.data;

  // Verify course exists
  const course = await prisma.curriculumCourse.findUnique({
    where: { id: cohortData.courseId }
  });

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Check code uniqueness
  const existingCohort = await prisma.cohort.findUnique({
    where: { code: cohortData.code }
  });

  if (existingCohort) {
    return NextResponse.json({ error: 'Cohort code already exists' }, { status: 400 });
  }

  // Create cohort with instructors
  const cohort = await prisma.cohort.create({
    data: {
      ...cohortData,
      startDate: new Date(cohortData.startDate),
      endDate: cohortData.endDate ? new Date(cohortData.endDate) : null,
      instructors: {
        create: instructorIds.map((userId, index) => ({
          userId,
          role: index === 0 ? 'LEAD' : 'ASSISTANT'
        }))
      }
    },
    include: {
      course: true,
      instructors: { include: { user: true } }
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'COHORT_CREATED',
      entity: 'COHORT',
      entityId: cohort.id,
      details: { code: cohort.code, name: cohort.name }
    }
  });

  return NextResponse.json(cohort, { status: 201 });
}
