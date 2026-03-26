import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil } from 'lucide-react';
import { getCourseBySlug, COURSE_COLOR_THEMES } from '@/lib/courses';
import { getPayloadLessonContent, getPayloadSiblingLessons } from '@/lib/payload/queries';
import { SectionRenderer } from '@/components/sections';
import { SectionZoneHeader } from '@/components/sections/SectionZoneHeader';
import { EditableLessonContent } from '@/components/editing/EditableLessonContent';
import { EditableLessonTitle } from '@/components/editing/EditableLessonTitle';
import MarkCompleteButton from '@/components/MarkCompleteButton';
import PrintButton from '@/components/PrintButton';
import ReadingProgress from '@/components/ReadingProgress';
import { LessonPresentationWrapper } from '@/components/LessonPresentationWrapper';
import { orderSections, getZoneLabel } from '@/lib/lesson-layout';
import { auth, hasMinimumRole } from '@/lib/auth';
import { LivePreviewListener } from '@/components/LivePreviewListener';
import type { LayoutVersion } from '@/lib/lesson-layout';
import type { ContentSection } from '@/lib/types/content';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  DynamicIcon,
  BookIcon,
} from '@/components/Icons';

// Calculate reading time based on content sections
function calculateReadingTime(sections: ContentSection[]): number {
  let wordCount = 0;
  for (const section of sections) {
    if (section.type === 'prose' && section.content) {
      wordCount += section.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    } else if (section.type === 'teaching-step') {
      wordCount += (section.instruction || '').split(/\s+/).length;
      if (section.paragraphs) {
        for (const p of section.paragraphs) {
          wordCount += p.split(/\s+/).length;
        }
      }
    } else if (section.type === 'heading') {
      wordCount += (section.text || '').split(/\s+/).length;
    }
  }
  return Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM average reading speed
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

  // Fetch lesson content and siblings from Payload CMS
  const [lessonResult, siblingsResult] = await Promise.allSettled([
    getPayloadLessonContent(lessonId),
    getPayloadSiblingLessons(lessonId),
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

  const { page, sections: rawSections, layoutVersion } = lessonData;
  const sections = orderSections(rawSections, (layoutVersion || 'standard-v1') as LayoutVersion);

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
  const readingTime = calculateReadingTime(sections);

  // Build the lesson progress indicator for the action slot
  const lessonProgressSlot = siblingLessons.length > 1 ? (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      <span className="font-medium text-text-primary">
        {currentIndex + 1}
      </span>
      <span>/</span>
      <span>{siblingLessons.length} lessons</span>
    </div>
  ) : null;

  // Check if user is admin/super admin (for edit button + inline editing)
  const session = await auth();
  const isAdmin = session && hasMinimumRole(session.user.role, 'ADMIN');

  // Build the action buttons
  const actionButtonsSlot = (
    <>
      {isAdmin && (
        <Link
          href={`/cms/collections/lessons/${lessonId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
          target="_blank"
        >
          <Pencil size={14} />
          Edit
        </Link>
      )}
      <PrintButton />
      <MarkCompleteButton lessonId={lessonId} />
    </>
  );

  return (
    <LessonPresentationWrapper
      actionSlot={lessonProgressSlot}
      actionButtons={actionButtonsSlot}
    >
      <div className="min-h-screen bg-surface-hover">
        {/* Live Preview — refreshes page when admin saves in CMS */}
        <LivePreviewListener />
        {/* Reading Progress Bar */}
        <ReadingProgress />

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
          bg-surface rounded-xl shadow-sm border border-border p-6 md:p-8
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
              {isAdmin ? (
                <EditableLessonTitle
                  lessonId={lessonId}
                  title={page.title}
                  className="text-2xl md:text-3xl font-bold text-text-primary mb-2"
                />
              ) : (
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
                  {page.title}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
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

        {/* Mode Toggle */}
        <div className="flex gap-4 mt-6 p-4 bg-slate-50 rounded-lg">
          <Link
            href={`/lessons/${lessonId}/prep`}
            className="flex-1 text-center py-3 px-4 bg-white border border-slate-200 rounded-lg hover:border-teal hover:bg-bamboo-50 transition-colors"
          >
            <span className="block font-semibold text-slate-900">Prep Mode</span>
            <span className="text-sm text-slate-500">Checklists & materials</span>
          </Link>
          <Link
            href={`/lessons/${lessonId}/teach`}
            className="flex-1 text-center py-3 px-4 bg-white border border-slate-200 rounded-lg hover:border-info hover:bg-info-light transition-colors"
          >
            <span className="block font-semibold text-slate-900">Teaching Mode</span>
            <span className="text-sm text-slate-500">Step-by-step delivery</span>
          </Link>
        </div>

        {/* Lesson Content */}
        <article className="mt-6 mb-8 bg-surface rounded-xl shadow-sm border border-border p-6 md:p-8">
          {isAdmin ? (
            <EditableLessonContent
              lessonId={lessonId}
              sections={sections}
              layoutVersion={(layoutVersion || 'standard-v1') as LayoutVersion}
            />
          ) : (
            <div className="space-y-6">
              {sections.map((section, index) => {
                const zoneLabel = getZoneLabel(sections, index, (layoutVersion || 'standard-v1') as LayoutVersion);
                return (
                  <div key={section.id}>
                    {zoneLabel && <SectionZoneHeader label={zoneLabel} />}
                    <SectionRenderer
                      section={section}
                      lessonId={lessonId}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* Bottom Navigation - Prev/Next */}
        <nav className="flex items-center justify-between gap-6 py-8 mt-4">
          {prevLesson ? (
            <Link
              href={`/courses/${courseSlug}/lessons/${prevLesson.id}`}
              className="flex-1 max-w-sm flex items-center gap-3 p-4 bg-surface rounded-xl border border-border hover:border-teal hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-hover group-hover:bg-bamboo-100 flex items-center justify-center transition-colors">
                <ChevronLeftIcon size={20} className="text-text-secondary group-hover:text-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary mb-0.5">Previous</p>
                <p className="text-sm font-medium text-text-primary truncate group-hover:text-teal">
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
              className="flex-1 max-w-sm flex items-center justify-end gap-3 p-4 bg-surface rounded-xl border border-border hover:border-teal hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs text-text-secondary mb-0.5">Next</p>
                <p className="text-sm font-medium text-text-primary truncate group-hover:text-teal">
                  {nextLesson.title}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-hover group-hover:bg-bamboo-100 flex items-center justify-center transition-colors">
                <ChevronRightIcon size={20} className="text-text-secondary group-hover:text-teal" />
              </div>
            </Link>
          ) : (
            <div className="flex-1 max-w-sm" />
          )}
        </nav>
      </div>

        {/* Print only: show simplified footer */}
        <div className="hidden print:block text-center text-sm text-text-tertiary py-8 border-t">
          <p>Bamboo Bicycle Club - {course.title}</p>
          <p>Printed from: {page.title}</p>
        </div>
      </div>
    </LessonPresentationWrapper>
  );
}
