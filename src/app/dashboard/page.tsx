import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getEnabledCourses, COURSE_COLOR_THEMES } from '@/lib/courses';
import {
  BambooIcon,
  BookIcon,
  ChevronRightIcon,
  DynamicIcon,
} from '@/components/Icons';
import UserMenu from '@/components/auth/UserMenu';
import { roleDisplayNames } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';

import {
  Users,
  BookOpen,
  Settings,
  ArrowRight,
  Calendar,
  Clock,
  GraduationCap,
} from 'lucide-react';

// Auth-gated pages must never be cached — always run fresh with current cookies
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  const user = session.user;
  const courses = getEnabledCourses();
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  const isInstructor = user.role === 'INSTRUCTOR' || isAdmin;

  // Fetch cohort and session data for instructors
  let cohorts: Awaited<ReturnType<typeof fetchInstructorCohorts>> = [];
  let upcomingSessions: Awaited<ReturnType<typeof fetchUpcomingSessions>> = [];
  let totalLearners = 0;

  if (isInstructor) {
    try {
      [cohorts, upcomingSessions] = await Promise.all([
        fetchInstructorCohorts(user.id, isAdmin),
        fetchUpcomingSessions(user.id, isAdmin),
      ]);
      totalLearners = cohorts.reduce((sum, c) => sum + c._count.learners, 0);
    } catch (error) {
      // Gracefully degrade if DB is unavailable
      console.error('Dashboard data fetch error:', error);
    }
  }

  const activeCohorts = cohorts.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'SCHEDULED'
  );

  return (
    <div className="min-h-screen bg-surface-hover">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center">
                <BambooIcon size={24} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-text-primary">Bamboo Bicycle Club</p>
                <p className="text-xs text-text-tertiary">Instructor Dashboard</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              )}
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-forest text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-white/70 text-sm mb-1">{roleDisplayNames[user.role]}</p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back, {user.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-white/70 mt-2">
                {isInstructor
                  ? 'Ready to inspire your learners today?'
                  : 'Continue your learning journey'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/cohorts">
                <Button variant="secondary" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-0">
                  <Users className="w-4 h-4" />
                  View Cohorts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-bamboo-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {isInstructor ? 'Available Courses' : 'Enrolled Courses'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isInstructor && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bamboo-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{activeCohorts.length}</p>
                      <p className="text-sm text-muted-foreground">Active Cohorts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bamboo-100 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{totalLearners}</p>
                      <p className="text-sm text-muted-foreground">Total Learners</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bamboo-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{upcomingSessions.length}</p>
                      <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Your Cohorts + Upcoming Sessions */}
        {isInstructor && activeCohorts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Your Cohorts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Your Cohorts</h2>
                <Link
                  href="/cohorts"
                  className="text-sm text-teal hover:underline font-medium"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {activeCohorts.slice(0, 4).map((cohort) => (
                  <Link key={cohort.id} href={`/cohorts/${cohort.id}`} className="block group">
                    <Card className="hover:shadow-md hover:border-teal transition-all">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-text-primary truncate">{cohort.name}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                cohort.status === 'IN_PROGRESS'
                                  ? 'bg-bamboo-100 text-forest'
                                  : 'bg-info-light text-info-dark'
                              }`}>
                                {cohort.status === 'IN_PROGRESS' ? 'Active' : 'Scheduled'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {cohort._count.learners} learner{cohort._count.learners !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(cohort.startDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              {cohort.course && (
                                <span className="truncate">{cohort.course.title}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRightIcon
                            size={18}
                            className="text-text-tertiary group-hover:text-teal group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            {/* Upcoming Sessions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Upcoming Sessions</h2>
              </div>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 4).map((sess) => (
                    <Link
                      key={sess.id}
                      href={`/cohorts/${sess.cohortId}`}
                      className="block group"
                    >
                      <Card className="hover:shadow-md hover:border-teal transition-all">
                        <CardContent className="py-4 px-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-text-primary truncate mb-1">
                                {sess.lesson?.title || 'Session'}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(sess.scheduledDate).toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                                {sess.scheduledTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {sess.scheduledTime}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {sess.cohort?.name}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning-light text-warning-dark font-medium flex-shrink-0 ml-2">
                              {formatRelativeDate(new Date(sess.scheduledDate))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-8">
                  <CardContent>
                    <Calendar className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No upcoming sessions scheduled</p>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        )}

        {/* Quick Actions for Instructors */}
        {isInstructor && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/cohorts" className="block">
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-bamboo-100 hover:border-teal">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-bamboo-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-teal" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary mb-1">Manage Cohorts</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage your course cohorts, learners, and sessions.
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-text-tertiary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={courses[0] ? `/courses/${courses[0].slug}` : '#'} className="block">
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-info-light hover:border-info-medium">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-info" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary mb-1">Browse Courses</h3>
                        <p className="text-sm text-muted-foreground">
                          Explore course content and prepare for your sessions.
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-text-tertiary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {isAdmin && (
                <Link href="/admin" className="block">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-assess-light hover:border-assess-medium">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-assess-light flex items-center justify-center flex-shrink-0">
                          <Settings className="w-5 h-5 text-assess" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-text-primary mb-1">Admin Panel</h3>
                          <p className="text-sm text-muted-foreground">
                            Manage users, settings, and system configuration.
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-text-tertiary" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">
              {isInstructor ? 'Your Courses' : 'Enrolled Courses'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const colorTheme = COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green;

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden hover:shadow-lg hover:border-teal transition-all">
                    {/* Course Header */}
                    <div className={`h-24 ${colorTheme.bgGradient} p-5 flex items-end`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                          <DynamicIcon name={course.icon} size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{course.shortTitle}</h3>
                          <p className="text-white/80 text-sm">{course.duration}</p>
                        </div>
                      </div>
                    </div>

                    {/* Course Body */}
                    <CardContent className="pt-4">
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${colorTheme.light} ${colorTheme.text}`}>
                            {course.level}
                          </span>
                          {course.accreditation && (
                            <span className="text-xs px-2 py-1 rounded-full bg-warning-light text-warning-dark">
                              {course.accreditation}
                            </span>
                          )}
                        </div>
                        <ChevronRightIcon
                          size={20}
                          className="text-text-tertiary group-hover:text-teal group-hover:translate-x-1 transition-all"
                        />
                      </div>

                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {courses.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-hover flex items-center justify-center">
                  <BookIcon size={32} className="text-text-tertiary" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No courses available
                </h3>
                <p className="text-muted-foreground">
                  {isInstructor
                    ? 'No courses have been enabled yet.'
                    : 'You are not enrolled in any courses.'}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

// --- Data fetching helpers ---

async function fetchInstructorCohorts(userId: string, isAdmin: boolean) {
  const where: Record<string, unknown> = {};

  if (!isAdmin) {
    where.instructors = { some: { userId } };
  }

  return prisma.cohort.findMany({
    where,
    include: {
      course: { select: { title: true, slug: true } },
      _count: { select: { learners: true, sessions: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

async function fetchUpcomingSessions(userId: string, isAdmin: boolean) {
  const now = new Date();

  const where: Record<string, unknown> = {
    scheduledDate: { gte: now },
    status: 'SCHEDULED',
  };

  if (!isAdmin) {
    where.cohort = {
      instructors: { some: { userId } },
    };
  }

  return prisma.sessionDelivery.findMany({
    where,
    include: {
      lesson: { select: { title: true } },
      cohort: { select: { name: true, id: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 5,
  });
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 14) return 'Next week';
  return `In ${Math.ceil(diffDays / 7)} weeks`;
}
