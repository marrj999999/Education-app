'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/lib/context/NavigationContext';
import { useProgress } from '@/context/ProgressContext';
import { COURSE_COLOR_THEMES } from '@/lib/courses';
import type { Course } from '@/lib/types';
import type { NavigationModule, NavigationLesson, NavigationUnit } from '@/lib/types/navigation';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Home,
  HelpCircle,
  X,
  PanelLeftClose,
  PanelLeft,
  Search,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface SidebarProps {
  course: Course;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const EXPANDED_MODULES_KEY = 'bamboo-expanded-modules';

// =============================================================================
// Subcomponents
// =============================================================================

const LessonItem = memo(function LessonItem({
  lesson,
  isActive,
  isComplete,
  colorTheme,
  collapsed,
}: {
  lesson: NavigationLesson;
  isActive: boolean;
  isComplete: boolean;
  colorTheme: (typeof COURSE_COLOR_THEMES)[keyof typeof COURSE_COLOR_THEMES];
  collapsed: boolean;
}) {
  if (collapsed) {
    // Icon-only mode: just show completion indicator
    return (
      <Link
        href={lesson.url}
        title={lesson.title}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full mx-auto',
          'transition-all duration-200',
          isActive
            ? `${colorTheme.light} ${colorTheme.text}`
            : isComplete
              ? `${colorTheme.bg} text-white`
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        )}
      >
        {isComplete ? (
          <Check size={14} />
        ) : isActive ? (
          <div className={`w-2 h-2 ${colorTheme.bg} rounded-full`} />
        ) : (
          <div className="w-2 h-2 bg-gray-300 rounded-full" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={lesson.url}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
        'transition-all duration-200 min-h-[44px]',
        isActive
          ? `${colorTheme.light} ${colorTheme.text} font-medium`
          : isComplete
            ? 'text-gray-500 hover:bg-gray-50'
            : 'text-gray-600 hover:bg-gray-50'
      )}
    >
      {/* Completion indicator */}
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
          isComplete
            ? `${colorTheme.bg} text-white`
            : isActive
              ? `border-2 ${colorTheme.border} ${colorTheme.light}`
              : 'border-2 border-gray-300'
        )}
      >
        {isComplete ? (
          <Check size={12} />
        ) : isActive ? (
          <div className={`w-2 h-2 ${colorTheme.bg} rounded-full`} />
        ) : null}
      </div>

      {/* Lesson title */}
      <span className={cn('truncate', isComplete && !isActive && 'line-through opacity-60')}>
        {lesson.title}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span className="ml-auto">
          <ChevronRight size={16} className={colorTheme.text} />
        </span>
      )}
    </Link>
  );
});

// =============================================================================
// Main Component
// =============================================================================

export const Sidebar = memo(function Sidebar({ course, className }: SidebarProps) {
  const pathname = usePathname();
  const { structure, sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed } =
    useNavigation();
  const { isComplete, getProgress } = useProgress();
  const sidebarRef = useRef<HTMLElement>(null);

  // Expanded modules state
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set());

  // Load expanded state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(EXPANDED_MODULES_KEY);
      if (stored) {
        setExpandedModules(new Set(JSON.parse(stored)));
      } else if (structure) {
        // Default: expand all modules
        setExpandedModules(new Set(structure.modules.map((m) => m.id)));
      }
    } catch {
      if (structure) {
        setExpandedModules(new Set(structure.modules.map((m) => m.id)));
      }
    }
  }, [structure]);

  // Save expanded state to localStorage
  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(EXPANDED_MODULES_KEY, JSON.stringify([...next]));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }, []);

  // Color theme
  const colorTheme = useMemo(
    () => COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green,
    [course.color]
  );

  // Progress
  const progress = getProgress();

  // Get module progress
  const getModuleProgress = useCallback(
    (module: NavigationModule): number => {
      const allLessons = [
        ...module.standaloneLessons,
        ...module.units.flatMap((u) => u.lessons),
      ];
      if (allLessons.length === 0) return 0;
      const completed = allLessons.filter((l) => isComplete(l.id)).length;
      return Math.round((completed / allLessons.length) * 100);
    },
    [isComplete]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!sidebarRef.current?.contains(document.activeElement)) return;

      // Handle keyboard navigation within sidebar
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSidebarOpen]);

  if (!structure) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-14 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200 z-50',
          'transform transition-all duration-300 ease-in-out',
          'flex flex-col shadow-lg lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:h-auto',
          sidebarCollapsed ? 'w-16' : 'w-72',
          className
        )}
        aria-label="Course navigation"
      >
        {/* Header */}
        <div className={cn('border-b border-gray-100', sidebarCollapsed ? 'p-2' : 'p-5')}>
          <div className="flex items-center justify-between">
            <Link
              href={`/courses/${course.slug}`}
              className={cn(
                'flex items-center gap-3 group',
                sidebarCollapsed && 'justify-center w-full'
              )}
            >
              <div
                className={cn(
                  'rounded-xl flex items-center justify-center text-white shadow-sm',
                  colorTheme.bgGradient,
                  sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'
                )}
              >
                <BookOpen size={20} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-gray-900">{course.shortTitle}</h1>
                  <p className="text-xs text-gray-500">Instructor Dashboard</p>
                </div>
              )}
            </Link>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* Close button (mobile only) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Back to courses (not in collapsed mode) */}
        {!sidebarCollapsed && (
          <div className="px-5 py-3 border-b border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={16} />
              All Courses
            </Link>
          </div>
        )}

        {/* Progress (not in collapsed mode) */}
        {!sidebarCollapsed && (
          <div className={cn('px-5 py-4 border-b border-gray-100', colorTheme.light)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Course Progress</span>
              <span className={cn('text-sm font-bold', colorTheme.text)}>{progress.percentage}%</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
              <div
                className={cn('h-full rounded-full transition-all duration-500', colorTheme.bgGradient)}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Check size={14} className={colorTheme.text} />
              {progress.completed} of {progress.total} lessons completed
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3" aria-label="Curriculum">
          {!sidebarCollapsed && (
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                Curriculum
              </p>
            </div>
          )}

          {structure.modules.map((module, index) => {
            const moduleProgress = getModuleProgress(module);
            const allLessons = [
              ...module.standaloneLessons,
              ...module.units.flatMap((u) => u.lessons),
            ];
            const isModuleActive = allLessons.some((l) => pathname.includes(l.id));
            const isExpanded = expandedModules.has(module.id);

            if (sidebarCollapsed) {
              // Icon-only mode: show module as icon with tooltip
              return (
                <div key={module.id} className="mb-2 px-2">
                  <button
                    onClick={() => toggleModule(module.id)}
                    title={module.name}
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center mx-auto',
                      'transition-all duration-200',
                      moduleProgress === 100
                        ? `${colorTheme.bg} text-white`
                        : isModuleActive
                          ? `${colorTheme.light} ${colorTheme.text}`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {moduleProgress === 100 ? <Check size={20} /> : <span className="font-bold">{index + 1}</span>}
                  </button>
                </div>
              );
            }

            return (
              <div key={module.id} className="mb-1 px-3">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left',
                    'transition-all duration-200 min-h-[48px]',
                    isModuleActive
                      ? `${colorTheme.light} border ${colorTheme.border}`
                      : 'hover:bg-gray-50 border border-transparent'
                  )}
                  aria-expanded={isExpanded}
                  aria-controls={`module-${module.id}-lessons`}
                >
                  {/* Module number badge */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                      moduleProgress === 100
                        ? `${colorTheme.bg} text-white`
                        : isModuleActive
                          ? `${colorTheme.light} ${colorTheme.text}`
                          : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {moduleProgress === 100 ? <Check size={16} /> : index + 1}
                  </div>

                  {/* Module title and progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium truncate',
                          isModuleActive ? colorTheme.text : 'text-gray-700'
                        )}
                      >
                        {module.name}
                      </span>
                    </div>
                    {allLessons.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', colorTheme.bg)}
                            style={{ width: `${moduleProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{moduleProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Expand icon */}
                  <ChevronRight
                    size={16}
                    className={cn(
                      'text-gray-400 transition-transform duration-200 flex-shrink-0',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </button>

                {/* Lessons */}
                {isExpanded && allLessons.length > 0 && (
                  <div
                    id={`module-${module.id}-lessons`}
                    className="ml-5 pl-6 border-l-2 border-gray-100 mt-1 mb-2 space-y-0.5"
                  >
                    {/* Units */}
                    {module.units.map((unit) => (
                      <div key={unit.name} className="mb-2">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-3 py-1">
                          {unit.name}
                        </p>
                        {unit.lessons.map((lesson) => (
                          <LessonItem
                            key={lesson.id}
                            lesson={lesson}
                            isActive={pathname.includes(lesson.id)}
                            isComplete={isComplete(lesson.id)}
                            colorTheme={colorTheme}
                            collapsed={false}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Standalone lessons */}
                    {module.standaloneLessons.map((lesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        isActive={pathname.includes(lesson.id)}
                        isComplete={isComplete(lesson.id)}
                        colorTheme={colorTheme}
                        collapsed={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Standalone lessons (resources, handbooks) */}
          {structure.standaloneLessons.length > 0 && (
            <>
              {!sidebarCollapsed && (
                <div className="px-3 mt-4 mb-2 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                    Resources
                  </p>
                </div>
              )}
              <div className={cn('px-3', sidebarCollapsed && 'mt-2')}>
                {structure.standaloneLessons.map((lesson) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
                    isActive={pathname.includes(lesson.id)}
                    isComplete={isComplete(lesson.id)}
                    colorTheme={colorTheme}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <Link
              href={`/courses/${course.slug}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm min-h-[44px]',
                'transition-colors',
                pathname === `/courses/${course.slug}`
                  ? `bg-white ${colorTheme.text} font-medium shadow-sm`
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              )}
            >
              <Home size={20} />
              Course Home
            </Link>

            <a
              href="https://www.bamboobicycleclub.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors mt-1 min-h-[44px]"
            >
              <HelpCircle size={20} />
              Help & Support
            </a>
          </div>
        )}
      </aside>
    </>
  );
});

export default Sidebar;
