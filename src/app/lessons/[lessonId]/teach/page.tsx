'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ClipboardList, X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentSection, SafetySection, CheckpointSection } from '@/lib/types/content';
import { isSafetySection, isCheckpointSection } from '@/lib/types/content';
import {
  SafetyBar,
  SectionStepper,
  SectionNavigator,
  CurrentSection,
  CheckpointPanel,
  KeyboardShortcutsHelp,
  PresentationToggle,
} from '@/components/teaching';
import { useNavigationOptional } from '@/lib/context/NavigationContext';

interface LessonData {
  page: {
    title: string;
    icon?: string;
  };
  sections: ContentSection[];
}

export default function TeachModePage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;
  const navigation = useNavigationOptional();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showLessonConfirm, setShowLessonConfirm] = useState<'next' | 'previous' | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Fetch lesson data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/sections`);
        if (!response.ok) {
          throw new Error('Failed to fetch lesson');
        }
        const data = await response.json();
        setLessonData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [lessonId]);

  // Extract safety and checkpoint sections
  const criticalSafety: SafetySection[] = lessonData?.sections
    .filter(isSafetySection)
    .filter((s) => s.level === 'critical') || [];

  const checkpoints: CheckpointSection[] = lessonData?.sections
    .filter(isCheckpointSection) || [];

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    if (lessonData) {
      setCurrentIndex((prev) => Math.min(lessonData.sections.length - 1, prev + 1));
    }
  }, [lessonData]);

  const navigateToSection = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Navigate to adjacent lesson
  const goToNextLesson = useCallback(() => {
    if (navigation?.nextLesson) {
      router.push(`${navigation.nextLesson.url}/teach`);
    }
  }, [navigation?.nextLesson, router]);

  const goToPreviousLesson = useCallback(() => {
    if (navigation?.previousLesson) {
      router.push(`${navigation.previousLesson.url}/teach`);
    }
  }, [navigation?.previousLesson, router]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (navigation?.previousLesson) {
            setShowLessonConfirm('previous');
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (navigation?.nextLesson) {
            setShowLessonConfirm('next');
          }
          break;
        case 'Escape':
          if (showHelp) {
            setShowHelp(false);
          } else if (showLessonConfirm) {
            setShowLessonConfirm(null);
          } else if (isPresentationMode) {
            setIsPresentationMode(false);
          } else {
            router.push(`/lessons/${lessonId}`);
          }
          break;
        case '?':
          e.preventDefault();
          setShowHelp(true);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, router, lessonId, showHelp, showLessonConfirm, navigation, isPresentationMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lessonData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Lesson not found'}</p>
          <Link
            href={`/lessons/${lessonId}`}
            className="text-green-600 hover:underline"
          >
            Back to lesson
          </Link>
        </div>
      </div>
    );
  }

  const { page, sections } = lessonData;
  const currentSection = sections[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < sections.length - 1;

  // Generate current section label
  const getSectionLabel = (section: ContentSection): string => {
    if ('title' in section && section.title) {
      return section.title;
    }
    if (section.type === 'heading' && 'text' in section) {
      return section.text;
    }
    if (section.type === 'teaching-step' && 'stepNumber' in section) {
      return `Step ${section.stepNumber}`;
    }
    return section.type.replace('-', ' ');
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      isPresentationMode && isDarkMode
        ? "bg-slate-900 text-slate-100"
        : "bg-gray-50"
    )}>
      {/* Safety Bar - Fixed at top */}
      {criticalSafety.length > 0 && <SafetyBar criticalSafety={criticalSafety} />}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Back/Exit button */}
            <Link
              href={`/lessons/${lessonId}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
              <span className="text-sm font-medium hidden sm:inline">Exit</span>
            </Link>

            {/* Title */}
            <div className="flex items-center gap-2">
              {page.icon && <span className="text-lg">{page.icon}</span>}
              <h1 className="text-sm sm:text-base font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[300px]">
                {page.title}
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <PresentationToggle
                isPresentation={isPresentationMode}
                onToggle={() => setIsPresentationMode(!isPresentationMode)}
                isDarkMode={isDarkMode}
                onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
              />
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors p-1.5 rounded hover:bg-gray-100"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard size={18} />
              </button>
              {!isPresentationMode && (
                <Link
                  href={`/lessons/${lessonId}/prep`}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ClipboardList size={20} />
                  <span className="text-sm font-medium hidden sm:inline">Prep</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Section Stepper */}
        <SectionStepper
          sections={sections}
          currentIndex={currentIndex}
          onNavigate={navigateToSection}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {currentSection && (
          <CurrentSection
            section={currentSection}
            lessonId={lessonId}
            isPresentation={isPresentationMode}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      {/* Checkpoint Panel */}
      {checkpoints.length > 0 && (
        <CheckpointPanel checkpoints={checkpoints} lessonId={lessonId} />
      )}

      {/* Bottom Navigation */}
      <SectionNavigator
        onPrevious={goToPrevious}
        onNext={goToNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        currentLabel={getSectionLabel(currentSection)}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />

      {/* Lesson Navigation Confirmation Dialog */}
      {showLessonConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {showLessonConfirm === 'next' ? 'Go to Next Lesson?' : 'Go to Previous Lesson?'}
            </h3>
            <p className="text-gray-600 mb-4">
              {showLessonConfirm === 'next'
                ? `Continue to "${navigation?.nextLesson?.title}"`
                : `Go back to "${navigation?.previousLesson?.title}"`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLessonConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showLessonConfirm === 'next') {
                    goToNextLesson();
                  } else {
                    goToPreviousLesson();
                  }
                  setShowLessonConfirm(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {showLessonConfirm === 'next' ? 'Next Lesson' : 'Previous Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
