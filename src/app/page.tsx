import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getEnabledCourses, getAllCourses, COURSE_COLOR_THEMES } from '@/lib/courses';
import {
  BambooIcon,
  ModuleIcon,
  BookIcon,
  CertificateIcon,
  ClockIcon,
  ChevronRightIcon,
  LevelIcon,
  DynamicIcon,
} from '@/components/Icons';
import UserMenu from '@/components/auth/UserMenu';

// Enable ISR - revalidate every 60 seconds for fast loads with fresh data
export const revalidate = 60;

export default async function Home() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const enabledCourses = getEnabledCourses();
  const allCourses = getAllCourses();
  const upcomingCourses = allCourses.filter(c => !c.enabled);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <nav className="max-w-6xl mx-auto px-6" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center">
                <BambooIcon size={24} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-gray-900">Bamboo Bicycle Club</p>
                <p className="text-xs text-gray-500">Instructor Portal</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                  <UserMenu user={user} />
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <div className="bg-green-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <BambooIcon size={28} className="text-white" />
                </div>
                <p className="text-green-200 text-sm font-medium uppercase tracking-wide">
                  Instructor Portal
                </p>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                Bamboo Bicycle Club
              </h1>
              <p className="text-green-100 text-lg max-w-xl">
                Access your course materials, track student progress, and manage your teaching journey across all our accredited programs.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-4 border border-white/20">
                <p className="text-green-200 text-sm mb-1">Available Courses</p>
                <p className="text-3xl font-bold">{enabledCourses.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <BookIcon size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{enabledCourses.length}</p>
                <p className="text-sm text-gray-500">Active Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ModuleIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{upcomingCourses.length}</p>
                <p className="text-sm text-gray-500">Coming Soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <CertificateIcon size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">OCN</p>
                <p className="text-sm text-gray-500">Accredited</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <LevelIcon size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Level 1-3</p>
                <p className="text-sm text-gray-500">Qualifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Active Courses Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Courses</h2>
              <p className="text-gray-500 mt-1">Select a course to view materials and track progress</p>
            </div>
          </div>

          {enabledCourses.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <p className="text-amber-800">No courses are currently enabled. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {enabledCourses.map((course) => {
                const colorTheme = COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green;

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-green-300 hover:shadow-lg transition-all"
                  >
                    {/* Course Header */}
                    <div className={`${colorTheme.bgGradient} p-6 text-white`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <DynamicIcon name={course.icon} size={24} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{course.title}</h3>
                            <p className="text-white/80 text-sm">{course.duration}</p>
                          </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-medium">
                          {course.level}
                        </div>
                      </div>
                    </div>

                    {/* Course Body */}
                    <div className="p-6">
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {course.accreditation && (
                            <span className="flex items-center gap-1.5">
                              <CertificateIcon size={16} />
                              {course.accreditation} Accredited
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <ClockIcon size={16} />
                            {course.duration}
                          </span>
                        </div>

                        <div className={`flex items-center gap-2 ${colorTheme.text} font-medium group-hover:gap-3 transition-all`}>
                          <span>Enter Course</span>
                          <ChevronRightIcon size={20} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Coming Soon Section */}
        {upcomingCourses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Coming Soon</h2>
                <p className="text-gray-500 mt-1">New courses in development</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingCourses.map((course) => {
                const colorTheme = COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green;

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 opacity-75"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${colorTheme.light} flex items-center justify-center`}>
                        <DynamicIcon name={course.icon} size={24} className={colorTheme.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{course.shortTitle}</h3>
                        <p className="text-sm text-gray-500 mb-2">{course.duration}</p>
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                <BambooIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Bamboo Bicycle Club</p>
                <p className="text-sm text-gray-500">OCN Accredited Training Programs</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
