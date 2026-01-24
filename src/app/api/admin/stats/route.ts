import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// GET /api/admin/stats - Get dashboard statistics
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'admin:access')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare date filters
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Run all queries in parallel for better performance
    const [
      usersByRole,
      activeUsers,
      recentSignups,
      recentLogins,
      totalCourses,
      enabledCourses,
      totalEnrollments,
      activeEnrollments,
      recentActivity,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
      prisma.course.count(),
      prisma.course.count({ where: { enabled: true } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);

    // Process role counts after parallel fetch
    const roleCounts = {
      SUPER_ADMIN: 0,
      ADMIN: 0,
      INSTRUCTOR: 0,
      STUDENT: 0,
    };

    usersByRole.forEach((item) => {
      roleCounts[item.role] = item._count.id;
    });

    const totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0);
    const suspendedUsers = totalUsers - activeUsers;

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: roleCounts,
        active: activeUsers,
        suspended: suspendedUsers,
        recentSignups,
        recentLogins,
      },
      courses: {
        total: totalCourses,
        enabled: enabledCourses,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching statistics' },
      { status: 500 }
    );
  }
}
