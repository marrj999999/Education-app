import { prisma } from '@/lib/db';
import Link from 'next/link';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;
// Force dynamic rendering - skip static generation at build time (requires database)
export const dynamic = 'force-dynamic';

async function getCourses() {
  return prisma.course.findMany({
    include: {
      instructors: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function CoursesAdminPage() {
  const courses = await getCourses();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Courses</h1>
        <p className="text-text-tertiary mt-1">
          Manage courses and instructor assignments
        </p>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden"
          >
            {/* Course Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {course.title}
                  </h3>
                  <p className="text-sm text-text-tertiary mt-1">
                    {course.description}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    course.enabled
                      ? 'bg-bamboo-100 text-forest'
                      : 'bg-surface-hover text-text-primary'
                  }`}
                >
                  {course.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Course Stats */}
            <div className="px-6 py-4 bg-surface-hover grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {course.instructors.length}
                </p>
                <p className="text-xs text-text-tertiary">Instructors</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {course._count.enrollments}
                </p>
                <p className="text-xs text-text-tertiary">Enrollments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {course.color}
                </p>
                <p className="text-xs text-text-tertiary">Theme</p>
              </div>
            </div>

            {/* Instructors */}
            <div className="p-6">
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Assigned Instructors
              </h4>
              {course.instructors.length > 0 ? (
                <ul className="space-y-2">
                  {course.instructors.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-white text-xs font-medium">
                          {(assignment.user.name || assignment.user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            {assignment.user.name || 'No name'}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {assignment.user.email}
                          </p>
                        </div>
                      </div>
                      {assignment.isPrimary && (
                        <span className="px-2 py-0.5 bg-bamboo-100 text-teal text-xs font-medium rounded-full">
                          Primary
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-tertiary">No instructors assigned</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <Link
                href={`/courses/${course.slug}`}
                className="text-sm text-teal hover:text-teal font-medium"
              >
                View Course
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary">
                  ID: {course.id}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-surface rounded-xl border border-border">
          <svg
            className="w-12 h-12 mx-auto text-text-tertiary mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No courses found
          </h3>
          <p className="text-text-tertiary">
            Courses are created through the database seed or migration.
          </p>
        </div>
      )}

      {/* CMS Link Card */}
      <div className="bg-bamboo-50 border border-bamboo-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-teal flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <div>
            <h4 className="font-medium text-forest">
              Content Management System
            </h4>
            <p className="text-sm text-teal mt-1">
              Create and edit course content using the CMS admin panel. Content
              changes appear automatically on lesson pages.
            </p>
            <Link
              href="/cms"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-teal hover:text-forest"
            >
              Open CMS Admin
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
