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
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <p className="text-gray-500 mt-1">
          Manage courses and instructor assignments
        </p>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Course Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {course.description}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    course.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {course.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Course Stats */}
            <div className="px-6 py-4 bg-gray-50 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {course.instructors.length}
                </p>
                <p className="text-xs text-gray-500">Instructors</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {course._count.enrollments}
                </p>
                <p className="text-xs text-gray-500">Enrollments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {course.color}
                </p>
                <p className="text-xs text-gray-500">Theme</p>
              </div>
            </div>

            {/* Instructors */}
            <div className="p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
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
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-medium">
                          {(assignment.user.name || assignment.user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {assignment.user.name || 'No name'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {assignment.user.email}
                          </p>
                        </div>
                      </div>
                      {assignment.isPrimary && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Primary
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No instructors assigned</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <Link
                href={`/courses/${course.slug}`}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                View Course
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Notion: {course.notionNavId.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No courses found
          </h3>
          <p className="text-gray-500">
            Courses are created through the database seed or migration.
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">
              Course Content from Notion
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Course content is managed in Notion and synced automatically. To add
              or modify lessons, edit the content in your Notion workspace. The
              dashboard will reflect changes within a few minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
