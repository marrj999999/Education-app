import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncCurriculum, getSyncStatus } from '@/lib/notion/sync';

/**
 * POST /api/admin/sync/curriculum
 *
 * Trigger a curriculum sync from Notion to database.
 * Only ADMIN and SUPER_ADMIN roles can trigger sync.
 */
export async function POST(request: Request) {
  // Authorization check
  const session = await auth();
  if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { courseSlug?: string; forceFullSync?: boolean; dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is OK
  }

  const { courseSlug, forceFullSync, dryRun } = body;

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'CURRICULUM_SYNC_INITIATED',
      entity: 'CURRICULUM',
      details: { courseSlug, forceFullSync, dryRun }
    }
  });

  try {
    const result = await syncCurriculum({
      courseSlug,
      forceFullSync: forceFullSync ?? false,
      dryRun: dryRun ?? false
    });

    // Log result
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: result.success ? 'CURRICULUM_SYNC_COMPLETED' : 'CURRICULUM_SYNC_FAILED',
        entity: 'CURRICULUM',
        details: {
          coursesProcessed: result.coursesProcessed,
          modulesProcessed: result.modulesProcessed,
          lessonsProcessed: result.lessonsProcessed,
          blocksProcessed: result.blocksProcessed,
          duration: result.duration,
          changes: result.changes,
          errorCount: result.errors.length
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    // Log error
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CURRICULUM_SYNC_FAILED',
        entity: 'CURRICULUM',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    });

    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync/curriculum
 *
 * Get sync status and last sync information.
 */
export async function GET() {
  // Authorization check
  const session = await auth();
  if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const status = getSyncStatus();

  // Get last successful sync from audit log
  const lastSync = await prisma.auditLog.findFirst({
    where: {
      action: { in: ['CURRICULUM_SYNC_COMPLETED', 'CURRICULUM_SYNC_FAILED'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get curriculum stats
  const [courseCount, moduleCount, lessonCount, blockCount] = await Promise.all([
    prisma.curriculumCourse.count(),
    prisma.curriculumModule.count(),
    prisma.curriculumLesson.count(),
    prisma.curriculumBlock.count()
  ]);

  return NextResponse.json({
    isRunning: status.isRunning,
    lastSyncTime: status.lastSyncTime,
    lastSyncResult: lastSync ? {
      timestamp: lastSync.createdAt,
      success: lastSync.action === 'CURRICULUM_SYNC_COMPLETED',
      details: lastSync.details
    } : null,
    stats: {
      courses: courseCount,
      modules: moduleCount,
      lessons: lessonCount,
      blocks: blockCount
    }
  });
}
