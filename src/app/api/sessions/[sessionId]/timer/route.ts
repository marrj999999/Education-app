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

// Validation schema for timer actions
const timerActionSchema = z.object({
  blockId: z.string(),
  action: z.enum(['START', 'PAUSE', 'RESUME', 'RESET', 'COMPLETE']),
  elapsedSeconds: z.number().int().min(0).optional()
});

/**
 * GET /api/sessions/[sessionId]/timer
 *
 * Get timer state for all blocks in a session.
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

  // Get all timer logs for this session
  const timerLogs = await prisma.timerLog.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'desc' }
  });

  // Group by block and get current state
  const timersByBlock = timerLogs.reduce((acc, log) => {
    if (!acc[log.blockId]) {
      // First entry (most recent) is the current state
      acc[log.blockId] = {
        blockId: log.blockId,
        currentAction: log.action,
        elapsedSeconds: log.elapsedSeconds || 0,
        lastUpdated: log.timestamp,
        history: []
      };
    }
    acc[log.blockId].history.push({
      action: log.action,
      elapsedSeconds: log.elapsedSeconds,
      timestamp: log.timestamp
    });
    return acc;
  }, {} as Record<string, {
    blockId: string;
    currentAction: string;
    elapsedSeconds: number;
    lastUpdated: Date;
    history: { action: string; elapsedSeconds: number | null; timestamp: Date }[];
  }>);

  return NextResponse.json({
    sessionId,
    timers: Object.values(timersByBlock)
  });
}

/**
 * POST /api/sessions/[sessionId]/timer
 *
 * Log a timer action (start, pause, resume, reset, complete).
 */
export async function POST(
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

  const validation = timerActionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const { blockId, action, elapsedSeconds } = validation.data;

  // Verify block exists and belongs to session's lesson
  const deliverySession = await prisma.sessionDelivery.findUnique({
    where: { id: sessionId },
    include: {
      lesson: {
        include: {
          blocks: {
            where: { id: blockId },
            select: { id: true, blockType: true }
          }
        }
      }
    }
  });

  if (!deliverySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (deliverySession.lesson.blocks.length === 0) {
    return NextResponse.json({ error: 'Block not found in session lesson' }, { status: 404 });
  }

  // Create timer log
  const timerLog = await prisma.timerLog.create({
    data: {
      sessionId,
      blockId,
      action,
      elapsedSeconds: elapsedSeconds ?? null,
      userId: session!.user.id
    }
  });

  // If session is not yet IN_PROGRESS and timer is started, auto-start session
  if (action === 'START' && deliverySession.status === 'SCHEDULED') {
    await prisma.sessionDelivery.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        actualStart: new Date()
      }
    });
  }

  return NextResponse.json({
    success: true,
    timerLog,
    blockId,
    action,
    elapsedSeconds: elapsedSeconds ?? 0
  });
}
