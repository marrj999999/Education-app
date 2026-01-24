import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCourseBySlug, COURSE_COLOR_THEMES } from '@/lib/courses';
import { getLessonContent, getModuleLessons } from '@/lib/notion';
import NotionRenderer from '@/components/NotionRenderer';
import MarkCompleteButton from '@/components/MarkCompleteButton';
import PrintButton from '@/components/PrintButton';
import ReadingProgress from '@/components/ReadingProgress';
import type { NotionBlock } from '@/lib/types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  DynamicIcon,
  BookIcon,
} from '@/components/Icons';

// Calculate reading time based on content word count
function calculateReadingTime(blocks: NotionBlock[]): number {
  const getText = (blocks: NotionBlock[]): string => {
    return blocks.map(b => {
      const blockType = b.type as keyof NotionBlock;
      const content = b[blockType];
      const richText = content && typeof content === 'object' && 'rich_text' in content
        ? (content as { rich_text: Array<{ plain_text: string }> }).rich_text?.map(t => t.plain_text).join('') || ''
        : '';
      const children = b.children ? getText(b.children) : '';
      return richText + ' ' + children;
    }).join(' ');
  };

  const text = getText(blocks);
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200)); // 200 WPM average reading speed
}

interface LessonPageProps {
  params: Promise<{
    courseSlug: string;
    lessonId: string;
  }>;
}

// Enable ISR - revalidate every 60 seconds for fast loads with fresh data
export const revalidate = 60;

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, lessonId } = await params;

  // Get course configuration
  const course = getCourseBySlug(courseSlug);

  if (!course || !course.enabled) {
    notFound();
  }

  // Fetch lesson content and sibling lessons in parallel for better performance
  const [lessonResult, siblingsResult] = await Promise.allSettled([
    getLessonContent(lessonId),
    getModuleLessons(lessonId),
  ]);

  // Handle lesson content result
  let lessonData;
  if (lessonResult.status === 'fulfilled') {
    lessonData = lessonResult.value;
  } else {
    console.error('Failed to fetch lesson:', lessonResult.reason);
    notFound();
  }

  if (!lessonData) {
    notFound();
  }

  const { page, blocks } = lessonData;

  // Handle sibling lessons result
  let siblingLessons: { id: string; title: string }[] = [];
  if (siblingsResult.status === 'fulfilled') {
    siblingLessons = siblingsResult.value;
  }

  // Find current lesson index for prev/next navigation
  const currentIndex = siblingLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;

  const colorTheme = COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green;

  // Calculate reading time
  const readingTime = calculateReadingTime(blocks);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Reading Progress Bar */}
      <ReadingProgress />

      {/* Lesson Actions Bar - minimal, actions only */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Lesson progress indicator */}
            {siblingLessons.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium text-gray-900">
                  {currentIndex + 1}
                </span>
                <span>/</span>
                <span>{siblingLessons.length} lessons</span>
              </div>
            )}
            {siblingLessons.length <= 1 && <div />}

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
        <div className={`relative h-48 md:h-64 lg:h-72 w-full overflow-hidden ${colorTheme.bgGradient}`}>
          <Image
            src={page.cover}
            alt=""
            fill
            className="object-cover opacity-90"
            priority
            sizes="100vw"
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
            {page.icon ? (
              <div className={`w-14 h-14 rounded-xl ${colorTheme.light} flex items-center justify-center flex-shrink-0`}>
                <span className="text-3xl">{page.icon}</span>
              </div>
            ) : (
              <div className={`w-14 h-14 rounded-xl ${colorTheme.bgGradient} flex items-center justify-center flex-shrink-0`}>
                <DynamicIcon name={course.icon} size={28} className="text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {page.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <span className="flex items-center gap-1.5">
                  <BookIcon size={16} />
                  {readingTime} min read
                </span>
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
        <article className="mt-6 mb-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="notion-content prose prose-gray max-w-none">
            <NotionRenderer blocks={blocks} courseSlug={courseSlug} />
          </div>
        </article>

        {/* Bottom Navigation - Prev/Next */}
        <nav className="flex items-center justify-between gap-6 py-8 mt-4">
          {prevLesson ? (
            <Link
              href={`/courses/${courseSlug}/lessons/${prevLesson.id}`}
              className="flex-1 max-w-sm flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <ChevronLeftIcon size={20} className="text-gray-600 group-hover:text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 mb-0.5">Previous</p>
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-green-700">
                  {prevLesson.title}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex-1 max-w-sm" />
          )}

          {nextLesson ? (
            <Link
              href={`/courses/${courseSlug}/lessons/${nextLesson.id}`}
              className="flex-1 max-w-sm flex items-center justify-end gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs text-gray-600 mb-0.5">Next</p>
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-green-700">
                  {nextLesson.title}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <ChevronRightIcon size={20} className="text-gray-600 group-hover:text-green-700" />
              </div>
            </Link>
          ) : (
            <div className="flex-1 max-w-sm" />
          )}
        </nav>
      </div>

      {/* Print only: show simplified footer */}
      <div className="hidden print:block text-center text-sm text-gray-500 py-8 border-t">
        <p>Bamboo Bicycle Club - {course.title}</p>
        <p>Printed from: {page.title}</p>
      </div>
    </div>
  );
}
