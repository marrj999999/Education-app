import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPayloadLessonContent } from '@/lib/payload/queries';
import {
  isChecklistSection,
  isTimelineSection,
  isSafetySection,
  isResourceSection,
} from '@/lib/types/content';
import {
  PrepChecklist,
  TimelineOverview,
  SafetySummary,
  ResourcesList,
  PrintButton,
  PrintHeader,
} from '@/components/prep';
import { ChevronLeft, PlayCircle } from 'lucide-react';

interface PrepPageProps {
  params: Promise<{
    lessonId: string;
  }>;
}

export const revalidate = 60;

export default async function PrepModePage({ params }: PrepPageProps) {
  const { lessonId } = await params;

  let lessonData;

  try {
    lessonData = await getPayloadLessonContent(lessonId);
  } catch (error) {
    console.error('Failed to fetch lesson:', error);
    notFound();
  }

  if (!lessonData) {
    notFound();
  }

  const { page, sections } = lessonData;

  // Filter by section type
  const checklists = sections.filter(isChecklistSection);
  const timelines = sections.filter(isTimelineSection);
  const safety = sections.filter(isSafetySection);
  const resources = sections.filter(isResourceSection);

  return (
    <div className="min-h-screen bg-surface-hover">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-border shadow-sm print:static print:shadow-none">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Back link */}
            <Link
              href={`/lessons/${lessonId}`}
              className="flex items-center gap-2 text-text-secondary hover:text-success transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back to Lesson</span>
            </Link>

            {/* Title */}
            <div className="flex items-center gap-2">
              {page.icon && <span className="text-xl">{page.icon}</span>}
              <h1 className="text-lg font-semibold text-text-primary truncate max-w-[200px] sm:max-w-none">
                {page.title}
              </h1>
              <span className="px-2 py-0.5 bg-warning-light text-warning-darker text-xs font-medium rounded-full">
                Prep Mode
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <PrintButton />
              <Link
                href={`/lessons/${lessonId}/teach`}
                className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success-dark transition-colors print:hidden"
              >
                <PlayCircle size={18} />
                <span className="hidden sm:inline">Start Teaching</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Print Header - Only visible when printing */}
      <PrintHeader title={page.title} icon={page.icon} />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
          {/* Safety Summary - Always show first if present */}
          {safety.length > 0 && (
            <section>
              <SafetySummary sections={safety} />
            </section>
          )}

          {/* Timeline Overview */}
          {timelines.length > 0 && (
            <section>
              <TimelineOverview sections={timelines} />
            </section>
          )}

          {/* Checklists */}
          {checklists.length > 0 && (
            <section>
              <PrepChecklist sections={checklists} lessonId={lessonId} />
            </section>
          )}

          {/* Resources */}
          {resources.length > 0 && (
            <section>
              <ResourcesList sections={resources} lessonId={lessonId} />
            </section>
          )}

          {/* Empty state */}
          {sections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-tertiary">No structured content found for this lesson.</p>
              <Link
                href={`/lessons/${lessonId}`}
                className="text-success hover:underline mt-2 inline-block"
              >
                View original lesson
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Print Footer */}
      <footer className="hidden print:block text-center text-sm text-text-tertiary py-8 border-t mt-8">
        <p>Bamboo Bicycle Club - Workshop Preparation</p>
        <p>{page.title}</p>
      </footer>
    </div>
  );
}
