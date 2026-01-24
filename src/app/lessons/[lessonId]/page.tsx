import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLessonContent, getModuleLessons } from '@/lib/notion';
import NotionRenderer from '@/components/NotionRenderer';
import MarkCompleteButton from '@/components/MarkCompleteButton';
import PrintButton from '@/components/PrintButton';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  ListIcon,
  HomeIcon,
} from '@/components/Icons';

interface LessonPageProps {
  params: Promise<{
    lessonId: string;
  }>;
}

// Enable ISR - revalidate every 60 seconds for fast loads with fresh data
export const revalidate = 60;

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;

  let lessonData;

  try {
    lessonData = await getLessonContent(lessonId);
  } catch (error) {
    console.error('Failed to fetch lesson:', error);
    notFound();
  }

  if (!lessonData) {
    notFound();
  }

  const { page, blocks } = lessonData;

  // Try to get sibling lessons for navigation
  let siblingLessons: { id: string; title: string }[] = [];
  try {
    siblingLessons = await getModuleLessons(lessonId);
  } catch (e) {
    // Ignore - we just won't show sibling navigation
  }

  // Find current lesson index for prev/next navigation
  const currentIndex = siblingLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar - Teachable style */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Back link */}
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
            >
              <ChevronLeftIcon size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back to Course</span>
            </Link>

            {/* Lesson progress indicator */}
            {siblingLessons.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-900">
                  {currentIndex + 1}
                </span>
                <span>/</span>
                <span>{siblingLessons.length} lessons</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <PrintButton />
              <MarkCompleteButton lessonId={lessonId} />
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image - Full width hero */}
      {page.cover && (
        <div className="relative h-48 md:h-64 lg:h-72 w-full overflow-hidden bg-green-700">
          <img
            src={page.cover}
            alt=""
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Lesson Header - Overlapping card style */}
        <header className={`
          bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8
          ${page.cover ? '-mt-16 relative z-10' : 'mt-8'}
        `}>
          <div className="flex items-start gap-4">
            {page.icon && (
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">{page.icon}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {page.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <ClockIcon size={16} />
                  Updated {new Date(page.last_edited_time).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                {siblingLessons.length > 1 && (
                  <span className="flex items-center gap-1.5">
                    <DocumentIcon size={16} />
                    Lesson {currentIndex + 1} of {siblingLessons.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Lesson Content */}
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 mt-6 mb-8">
          <div className="notion-content prose prose-gray max-w-none">
            <NotionRenderer blocks={blocks} />
          </div>
        </article>

        {/* Child Pages / Related Lessons */}
        {siblingLessons.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ListIcon size={20} className="text-green-600" />
              Lessons in This Section
            </h2>
            <div className="space-y-2">
              {siblingLessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.id}`}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg border transition-all
                    ${lesson.id === lessonId
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-100 hover:border-green-200 hover:bg-green-50'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    ${lesson.id === lessonId
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                    }
                  `}>
                    {index + 1}
                  </div>
                  <span className={`
                    flex-1 font-medium truncate
                    ${lesson.id === lessonId ? 'text-green-800' : 'text-gray-700'}
                  `}>
                    {lesson.title}
                  </span>
                  {lesson.id === lessonId && (
                    <span className="text-xs bg-green-200 text-green-800 px-2.5 py-1 rounded-full font-medium">
                      Current
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Navigation - Prev/Next */}
        <div className="flex items-center justify-between gap-4 pb-12">
          {prevLesson ? (
            <Link
              href={`/lessons/${prevLesson.id}`}
              className="flex-1 max-w-xs flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <ChevronLeftIcon size={20} className="text-gray-500 group-hover:text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Previous</p>
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-green-700">
                  {prevLesson.title}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex-1 max-w-xs" />
          )}

          <Link
            href="/"
            className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-green-100 flex items-center justify-center transition-colors"
          >
            <HomeIcon size={20} className="text-gray-600" />
          </Link>

          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.id}`}
              className="flex-1 max-w-xs flex items-center justify-end gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs text-gray-500 mb-0.5">Next</p>
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-green-700">
                  {nextLesson.title}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <ChevronRightIcon size={20} className="text-gray-500 group-hover:text-green-600" />
              </div>
            </Link>
          ) : (
            <div className="flex-1 max-w-xs" />
          )}
        </div>
      </div>

      {/* Print only: show simplified footer */}
      <div className="hidden print:block text-center text-sm text-gray-500 py-8 border-t">
        <p>Bamboo Bicycle Club - Instructor Course Materials</p>
        <p>Printed from: {page.title}</p>
      </div>
    </div>
  );
}
