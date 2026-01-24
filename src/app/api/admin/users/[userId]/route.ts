import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, canAssignRole } from '@/lib/permissions';
import type { Role } from '@prisma/client';

// Validation schema for updating a user
const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT']).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
});

type RouteParams = { params: Promise<{ userId: string }> };

// GET /api/admin/users/[userId] - Get single user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'users:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        image: true,
        emailVerified: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            enrolledAt: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        instructorCourses: {
          select: {
            id: true,
            isPrimary: true,
            assignedAt: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[userId] - Update user
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'users:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, role, isActive, password } = result.data;

    // Find the user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-demotion below ADMIN
    if (
      userId === session.user.id &&
      role &&
      role !== 'SUPER_ADMIN' &&
      role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'You cannot demote yourself below Admin' },
        { status: 400 }
      );
    }

    // Check role assignment permissions
    if (role && !canAssignRole(session.user.role, role as Role)) {
      return NextResponse.json(
        { error: 'You do not have permission to assign this role' },
        { status: 403 }
      );
    }

    // Check email uniqueness if changing
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password !== undefined) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_USER',
        entity: 'USER',
        entityId: user.id,
        details: {
          changes: Object.keys(updateData).filter((k) => k !== 'password'),
          roleChanged: role ? { from: existingUser.role, to: role } : undefined,
          statusChanged:
            isActive !== undefined
              ? { from: existingUser.isActive, to: isActive }
              : undefined,
        },
      },
    });

    return NextResponse.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'users:delete')) {
      return NextResponse.json(
        { error: 'Only Super Admins can delete users' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Find the user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the user (cascades to enrollments, progress, etc.)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the action (user is deleted, so we store details in the log)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_USER',
        entity: 'USER',
        entityId: userId,
        details: {
          deletedUserEmail: existingUser.email,
          deletedUserRole: existingUser.role,
        },
      },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the user' },
      { status: 500 }
    );
  }
}
