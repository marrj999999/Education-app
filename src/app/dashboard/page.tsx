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
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Calendar,
  BookOpen,
  Settings,
  TrendingUp,
  Clock,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

// Enable ISR - revalidate every 5 minutes for cached page shell
export const revalidate = 300;

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  const user = session.user;
  const courses = getEnabledCourses();
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  const isInstructor = user.role === 'INSTRUCTOR' || isAdmin;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center">
                <BambooIcon size={24} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-gray-900">Bamboo Bicycle Club</p>
                <p className="text-xs text-gray-500">Instructor Dashboard</p>
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
      <div className="bg-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-green-100 text-sm mb-1">{roleDisplayNames[user.role]}</p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back, {user.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-green-100 mt-2">
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
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {isInstructor ? 'Available Courses' : 'Enrolled Courses'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0%</p>
                  <p className="text-sm text-muted-foreground">Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-sm text-muted-foreground">Last Activity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Instructors */}
        {isInstructor && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/cohorts" className="block">
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-green-100 hover:border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">Manage Cohorts</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage your course cohorts, learners, and sessions.
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={courses[0] ? `/courses/${courses[0].slug}` : '#'} className="block">
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-blue-100 hover:border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">Browse Courses</h3>
                        <p className="text-sm text-muted-foreground">
                          Explore course content and prepare for your sessions.
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {isAdmin && (
                <Link href="/admin" className="block">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-purple-100 hover:border-purple-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">Admin Panel</h3>
                          <p className="text-sm text-muted-foreground">
                            Manage users, settings, and system configuration.
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
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
            <h2 className="text-lg font-semibold text-gray-900">
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
                  <Card className="h-full overflow-hidden hover:shadow-lg hover:border-green-300 transition-all">
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
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                              {course.accreditation}
                            </span>
                          )}
                        </div>
                        <ChevronRightIcon
                          size={20}
                          className="text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all"
                        />
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>0%</span>
                        </div>
                        <Progress value={0} className="h-2" />
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
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <BookIcon size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
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
