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

// Validation schema for checklist update
const checklistUpdateSchema = z.object({
  blockId: z.string(),
  itemIndex: z.number().int().min(0),
  completed: z.boolean()
});

// Bulk checklist update
const bulkChecklistSchema = z.object({
  items: z.array(checklistUpdateSchema)
});

/**
 * GET /api/sessions/[sessionId]/checklist
 *
 * Get checklist progress for all blocks in a session.
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

  // Get all checklist progress for this session
  const progress = await prisma.checklistProgress.findMany({
    where: { sessionId },
    include: {
      completedByUser: {
        select: { id: true, name: true }
      }
    },
    orderBy: [{ blockId: 'asc' }, { itemIndex: 'asc' }]
  });

  // Group by block
  const byBlock = progress.reduce((acc, item) => {
    if (!acc[item.blockId]) {
      acc[item.blockId] = {
        blockId: item.blockId,
        items: [],
        completedCount: 0,
        totalCount: 0
      };
    }
    acc[item.blockId].items.push({
      itemIndex: item.itemIndex,
      completed: item.completed,
      completedBy: item.completedByUser
    });
    acc[item.blockId].totalCount++;
    if (item.completed) {
      acc[item.blockId].completedCount++;
    }
    return acc;
  }, {} as Record<string, {
    blockId: string;
    items: { itemIndex: number; completed: boolean; completedBy: { id: string; name: string | null } | null }[];
    completedCount: number;
    totalCount: number;
  }>);

  // Calculate overall progress
  const totalItems = progress.length;
  const completedItems = progress.filter(p => p.completed).length;

  return NextResponse.json({
    sessionId,
    checklists: Object.values(byBlock),
    summary: {
      totalItems,
      completedItems,
      progressPercent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    }
  });
}

/**
 * POST /api/sessions/[sessionId]/checklist
 *
 * Update checklist item(s) progress.
 * Supports both single and bulk updates.
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

  // Check if bulk or single
  const isBulk = 'items' in body;

  if (isBulk) {
    const validation = bulkChecklistSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { items } = validation.data;

    // Verify all blocks exist in session's lesson
    const blockIds = [...new Set(items.map(i => i.blockId))];
    const deliverySession = await prisma.sessionDelivery.findUnique({
      where: { id: sessionId },
      include: {
        lesson: {
          include: {
            blocks: {
              where: { id: { in: blockIds } },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!deliverySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const validBlockIds = new Set(deliverySession.lesson.blocks.map(b => b.id));
    const invalidBlocks = blockIds.filter(id => !validBlockIds.has(id));
    if (invalidBlocks.length > 0) {
      return NextResponse.json(
        { error: 'Some blocks not found in session lesson', invalidBlocks },
        { status: 400 }
      );
    }

    // Upsert all items
    const results = await Promise.all(
      items.map(item =>
        prisma.checklistProgress.upsert({
          where: {
            sessionId_blockId_itemIndex: {
              sessionId,
              blockId: item.blockId,
              itemIndex: item.itemIndex
            }
          },
          create: {
            sessionId,
            blockId: item.blockId,
            itemIndex: item.itemIndex,
            completed: item.completed,
            completedBy: item.completed ? session!.user.id : null
          },
          update: {
            completed: item.completed,
            completedBy: item.completed ? session!.user.id : null
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      updated: results.length,
      items: results
    });
  } else {
    // Single update
    const validation = checklistUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { blockId, itemIndex, completed } = validation.data;

    // Verify block exists in session's lesson
    const deliverySession = await prisma.sessionDelivery.findUnique({
      where: { id: sessionId },
      include: {
        lesson: {
          include: {
            blocks: {
              where: { id: blockId },
              select: { id: true }
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

    const progress = await prisma.checklistProgress.upsert({
      where: {
        sessionId_blockId_itemIndex: { sessionId, blockId, itemIndex }
      },
      create: {
        sessionId,
        blockId,
        itemIndex,
        completed,
        completedBy: completed ? session!.user.id : null
      },
      update: {
        completed,
        completedBy: completed ? session!.user.id : null
      }
    });

    return NextResponse.json({
      success: true,
      item: progress
    });
  }
}
