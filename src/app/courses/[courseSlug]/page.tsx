import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCourseBySlug, COURSE_COLOR_THEMES } from '@/lib/courses';
import { getPayloadCourseStructure, getPayloadHandbookSections } from '@/lib/payload/queries';
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
  if (course.isHandbook) {
    let sections: HandbookSection[] = [];
    try {
      const handbookDocs = await getPayloadHandbookSections();
      // Map Payload handbook docs to HandbookSection type
      sections = handbookDocs.map((doc: any) => ({
        id: doc.id,
        name: doc.title || 'Untitled',
        pageRange: doc.pageRange || '',
        order: doc.order ?? 0,
        images: (doc.images || []).map((img: any) => ({
          url: typeof img.image === 'object' ? img.image?.url || '' : '',
          caption: img.caption || '',
        })),
        section: doc.section || '',
        chapter: doc.chapter || '',
        icon: doc.icon || '',
        slug: doc.slug || '',
        hasVideo: doc.hasVideo || false,
        estTime: doc.estTime || '',
      }));
    } catch (error) {
      console.error('Failed to fetch handbook data:', error);
    }
    return <HandbookPage course={course} sections={sections} />;
  }

  // Fetch course data from Payload CMS (for regular courses)
  let courseData;
  try {
    courseData = await getPayloadCourseStructure(courseSlug);
  } catch (error) {
    console.error('Failed to fetch course data:', error);
  }

  const totalLessons = courseData?.modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  ) ?? 0;

  const colorTheme = COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green;

  return (
    <div className="min-h-screen bg-surface-hover">
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
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-text-primary rounded-lg font-semibold hover:bg-surface-hover transition-colors"
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
          <div className="bg-surface rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colorTheme.light} flex items-center justify-center`}>
                <ModuleIcon size={20} className={colorTheme.text} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{courseData?.modules.length ?? 0}</p>
                <p className="text-sm text-text-tertiary">Modules</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center">
                <BookIcon size={20} className="text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{totalLessons}</p>
                <p className="text-sm text-text-tertiary">Lessons</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <CertificateIcon size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{course.accreditation || 'N/A'}</p>
                <p className="text-sm text-text-tertiary">Accredited</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-assess-light flex items-center justify-center">
                <LevelIcon size={20} className="text-assess" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{course.level}</p>
                <p className="text-sm text-text-tertiary">Qualification</p>
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
              <h2 className="text-2xl font-bold text-text-primary">Course Curriculum</h2>
              <p className="text-text-tertiary mt-1">Master bamboo bicycle building step by step</p>
            </div>
          </div>

          {!courseData || courseData.modules.length === 0 ? (
            <div className="bg-warning-light border border-warning-medium rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center flex-shrink-0">
                  <WarningIcon size={20} className="text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-warning-darker">Unable to load course content</h3>
                  <p className="text-warning-dark text-sm mt-1">
                    Please check that the CMS has content for this course.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {courseData.modules.map((module, index) => (
                <div
                  key={module.id}
                  className="bg-surface rounded-xl border border-border overflow-hidden transition-all"
                >
                  {/* Module Header */}
                  <div className="p-5 flex items-center gap-5">
                    {/* Module Number */}
                    <div className={`w-12 h-12 rounded-xl ${colorTheme.bgGradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                      {index + 1}
                    </div>

                    {/* Module Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ModuleIcon size={20} className="text-text-tertiary" />
                        <h3 className="font-semibold text-text-primary truncate">
                          {module.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <DocumentIcon size={16} />
                          {module.lessons.length} lessons
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lesson Links */}
                  {module.lessons.length > 0 && (
                    <div className="border-t border-border">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <Link
                          key={lesson.id}
                          href={`/courses/${courseSlug}/lessons/${lesson.id}`}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors group border-b border-surface-hover last:border-b-0"
                        >
                          <div className="w-7 h-7 rounded-lg bg-surface-hover group-hover:bg-bamboo-100 flex items-center justify-center text-xs font-bold text-text-tertiary group-hover:text-teal flex-shrink-0 transition-colors">
                            {lessonIndex + 1}
                          </div>
                          <span className="flex-1 text-sm font-medium text-text-secondary group-hover:text-teal truncate transition-colors">
                            {lesson.title}
                          </span>
                          <ChevronRightIcon
                            size={16}
                            className="text-text-tertiary group-hover:text-teal group-hover:translate-x-0.5 transition-all flex-shrink-0"
                          />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="px-5 pb-4 pt-2">
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div className={`h-full ${colorTheme.bgGradient} rounded-full w-0 transition-all`} />
                    </div>
                  </div>
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
                <h2 className="text-2xl font-bold text-text-primary">Resources & Materials</h2>
                <p className="text-text-tertiary mt-1">Supplementary materials for your teaching</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...courseData.handbooks, ...courseData.resources].map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className="bg-surface rounded-xl p-5 border border-border hover:border-teal hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover group-hover:bg-bamboo-100 flex items-center justify-center transition-colors">
                      <DocumentIcon size={20} className="text-text-tertiary group-hover:text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary group-hover:text-teal transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-text-tertiary mt-1">View resource</p>
                    </div>
                    <ExternalLinkIcon size={20} className="text-text-tertiary group-hover:text-teal flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorTheme.bgGradient} flex items-center justify-center`}>
                <BambooIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Bamboo Bicycle Club</p>
                <p className="text-sm text-text-tertiary">{course.title}</p>
              </div>
            </div>
            <p className="text-sm text-text-tertiary">
              &copy; {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
