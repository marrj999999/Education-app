import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  getCustomSectionOrder,
  saveCustomSectionOrder,
  resetSectionOrder,
} from '@/lib/section-ordering';

interface RouteParams {
  params: Promise<{
    lessonId: string;
  }>;
}

// Validation schema for saving section order
const saveSectionOrderSchema = z.object({
  sectionIds: z.array(z.string()).min(1, 'At least one section ID required'),
});

/**
 * GET /api/admin/lessons/[lessonId]/section-order
 * Returns the custom section order for a lesson (if any)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view section orders
    if (!hasPermission(session.user.role, 'admin:access')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lessonId } = await params;

    const orders = await getCustomSectionOrder(lessonId);

    return NextResponse.json({
      lessonId,
      hasCustomOrder: orders.length > 0,
      orders: orders.map((o) => ({
        sectionId: o.sectionId,
        sortOrder: o.sortOrder,
      })),
    });
  } catch (error) {
    console.error('Failed to get section order:', error);
    return NextResponse.json(
      { error: 'Failed to get section order' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/lessons/[lessonId]/section-order
 * Saves a new custom section order for a lesson
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can modify section orders
    if (!hasPermission(session.user.role, 'admin:access')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lessonId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const parsed = saveSectionOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { sectionIds } = parsed.data;

    await saveCustomSectionOrder(lessonId, sectionIds, session.user.id);

    return NextResponse.json({
      success: true,
      lessonId,
      sectionCount: sectionIds.length,
    });
  } catch (error) {
    console.error('Failed to save section order:', error);
    return NextResponse.json(
      { error: 'Failed to save section order' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/lessons/[lessonId]/section-order
 * Resets section order to default (removes custom order)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reset section orders
    if (!hasPermission(session.user.role, 'admin:access')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lessonId } = await params;

    await resetSectionOrder(lessonId);

    return NextResponse.json({
      success: true,
      lessonId,
      message: 'Section order reset to default',
    });
  } catch (error) {
    console.error('Failed to reset section order:', error);
    return NextResponse.json(
      { error: 'Failed to reset section order' },
      { status: 500 }
    );
  }
}
