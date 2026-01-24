import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCourseBySlug, COURSE_COLOR_THEMES } from '@/lib/courses';
import { getCourseStructure, getFullCourseStructure } from '@/lib/notion';
import { getHandbookDataForCourse } from '@/lib/notion-handbook';
import { HandbookPage } from '@/components/handbook';
import type { HandbookSection } from '@/lib/types';
import {
  BambooIcon,
  ModuleIcon,
  BookIcon,
  DocumentIcon,
  CertificateIcon,
  LevelIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  WarningIcon,
  ExternalLinkIcon,
  ClockIcon,
  DynamicIcon,
} from '@/components/Icons';

interface CoursePageProps {
  params: Promise<{
    courseSlug: string;
  }>;
}

// Enable ISR - revalidate every 60 seconds for fast loads with fresh data
export const revalidate = 60;

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseSlug } = await params;

  // Get course configuration
  const course = getCourseBySlug(courseSlug);

  if (!course || !course.enabled) {
    notFound();
  }

  // If this is a handbook-style course, render the handbook layout
  if (course.isHandbook && course.notionDatabaseId) {
    let sections: HandbookSection[] = [];
    try {
      sections = await getHandbookDataForCourse(course);
    } catch (error) {
      console.error('Failed to fetch handbook data:', error);
    }
    return <HandbookPage course={course} sections={sections} />;
  }

  // Fetch course data from Notion (for regular courses)
  let courseData;
  try {
    // Use the course-specific structure if notionNavId is provided, otherwise use default
    if (course.notionNavId) {
      courseData = await getCourseStructure(course);
    } else {
      courseData = await getFullCourseStructure();
    }
  } catch (error) {
    console.error('Failed to fetch course data:', error);
  }

  const totalLessons = courseData?.modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  ) ?? 0;

  const colorTheme = COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className={`${colorTheme.bgGradient} text-white`}>
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ChevronLeftIcon size={16} />
              <span className="text-sm font-medium">All Courses</span>
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <DynamicIcon name={course.icon} size={28} className="text-white" />
                </div>
                <p className="text-white/80 text-sm font-medium uppercase tracking-wide">
                  Instructor Portal
                </p>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                {course.title}
              </h1>
              <p className="text-white/90 text-lg max-w-xl">
                {course.description}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="#modules"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <BookIcon size={20} />
                Start Learning
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colorTheme.light} flex items-center justify-center`}>
                <ModuleIcon size={20} className={colorTheme.text} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{courseData?.modules.length ?? 0}</p>
                <p className="text-sm text-gray-500">Modules</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
                <p className="text-sm text-gray-500">Lessons</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <CertificateIcon size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{course.accreditation || 'N/A'}</p>
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
                <p className="text-2xl font-bold text-gray-900">{course.level}</p>
                <p className="text-sm text-gray-500">Qualification</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Course Modules Section */}
        <section id="modules" className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Course Curriculum</h2>
              <p className="text-gray-500 mt-1">Master bamboo bicycle building step by step</p>
            </div>
          </div>

          {!courseData || courseData.modules.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <WarningIcon size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Unable to load course content</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    Please check that your Notion API key is configured correctly.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {courseData.modules.map((module, index) => (
                <div
                  key={module.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-green-300 hover:shadow-md transition-all group"
                >
                  <Link href={`/courses/${courseSlug}/lessons/${module.id}`} className="block">
                    <div className="p-5 flex items-center gap-5">
                      {/* Module Number */}
                      <div className={`w-12 h-12 rounded-xl ${colorTheme.bgGradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                        {index + 1}
                      </div>

                      {/* Module Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ModuleIcon size={20} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors truncate">
                            {module.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DocumentIcon size={16} />
                            {module.lessons.length} lessons
                          </span>
                        </div>

                        {/* Lesson Preview Tags */}
                        {module.lessons.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {module.lessons.slice(0, 3).map((lesson) => (
                              <span
                                key={lesson.id}
                                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                              >
                                {lesson.title.length > 30 ? lesson.title.slice(0, 30) + '...' : lesson.title}
                              </span>
                            ))}
                            {module.lessons.length > 3 && (
                              <span className="text-xs text-gray-400 px-2 py-1">
                                +{module.lessons.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0">
                        <ChevronRightIcon
                          size={20}
                          className="text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all"
                        />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-5 pb-4">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colorTheme.bgGradient} rounded-full w-0 transition-all`} />
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resources Section */}
        {courseData && (courseData.handbooks.length > 0 || courseData.resources.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Resources & Materials</h2>
                <p className="text-gray-500 mt-1">Supplementary materials for your teaching</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...courseData.handbooks, ...courseData.resources].map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className="bg-white rounded-xl p-5 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                      <DocumentIcon size={20} className="text-gray-500 group-hover:text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-green-600 transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">View resource</p>
                    </div>
                    <ExternalLinkIcon size={20} className="text-gray-400 group-hover:text-green-600 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorTheme.bgGradient} flex items-center justify-center`}>
                <BambooIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Bamboo Bicycle Club</p>
                <p className="text-sm text-gray-500">{course.title}</p>
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
