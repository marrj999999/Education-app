'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProgress } from '@/context/ProgressContext';
import { COURSE_COLOR_THEMES } from '@/lib/courses';
import type { Module, Course, Lesson } from '@/lib/types';
import {
  ModuleIcon,
  HomeIcon,
  HelpIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  DynamicIcon,
} from '@/components/Icons';

interface CourseSidebarProps {
  modules: Module[];
  course: Course;
  isOpen: boolean;
  onToggle: () => void;
}

// Memoized lesson item component
const LessonItem = memo(function LessonItem({
  lesson,
  courseSlug,
  isActive,
  completed,
  colorTheme,
}: {
  lesson: Lesson;
  courseSlug: string;
  isActive: boolean;
  completed: boolean;
  colorTheme: typeof COURSE_COLOR_THEMES.green;
}) {
  return (
    <Link
      href={`/courses/${courseSlug}/lessons/${lesson.id}`}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
        transition-all duration-200
        ${isActive
          ? `${colorTheme.light} ${colorTheme.text} font-medium`
          : completed
            ? 'text-gray-500 hover:bg-gray-50'
            : 'text-gray-600 hover:bg-gray-50'
        }
      `}
    >
      {/* Completion indicator */}
      <div className={`
        w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
        ${completed
          ? `${colorTheme.bg} text-white`
          : isActive
            ? `border-2 ${colorTheme.border} ${colorTheme.light}`
            : 'border-2 border-gray-300'
        }
      `}>
        {completed ? (
          <CheckIcon size={12} />
        ) : isActive ? (
          <div className={`w-2 h-2 ${colorTheme.bg} rounded-full`} />
        ) : null}
      </div>

      {/* Lesson title */}
      <span className={`truncate ${completed && !isActive ? 'line-through opacity-60' : ''}`}>
        {lesson.title}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span className="ml-auto">
          <ChevronRightIcon size={16} className={colorTheme.text} />
        </span>
      )}
    </Link>
  );
});

export default memo(function CourseSidebar({ modules, course, isOpen, onToggle }: CourseSidebarProps) {
  const pathname = usePathname();
  const { isComplete, getProgress } = useProgress();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(modules.map(m => m.id)));

  const progress = getProgress();
  const colorTheme = useMemo(() => COURSE_COLOR_THEMES[course.color] || COURSE_COLOR_THEMES.green, [course.color]);

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // Calculate module progress - memoized per module
  const getModuleProgress = useCallback((module: Module) => {
    if (module.lessons.length === 0) return 0;
    const completed = module.lessons.filter(l => isComplete(l.id)).length;
    return Math.round((completed / module.lessons.length) * 100);
  }, [isComplete]);

  return (
    <>
      {/* Mobile overlay - starts below TopNav */}
      {isOpen && (
        <div
          className="fixed inset-0 top-14 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar - positioned below TopNav */}
      <aside
        className={`
          fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-72 bg-white border-r border-gray-200 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:h-auto
          flex flex-col
          shadow-lg lg:shadow-none
        `}
      >
        {/* Header - Course branding */}
        <div className="p-5 border-b border-gray-100">
          <Link href={`/courses/${course.slug}`} className="flex items-center gap-3 group">
            <div className={`w-10 h-10 rounded-xl ${colorTheme.bgGradient} flex items-center justify-center text-white shadow-sm`}>
              <DynamicIcon name={course.icon} size={20} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-gray-900 group-hover:${colorTheme.text} transition-colors`}>
                {course.shortTitle}
              </h1>
              <p className="text-xs text-gray-500">Instructor Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Back to all courses */}
        <div className="px-5 py-3 border-b border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeftIcon size={16} />
            All Courses
          </Link>
        </div>

        {/* Overall Progress */}
        <div className={`px-5 py-4 ${colorTheme.light} border-b border-gray-100`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Course Progress</span>
            <span className={`text-sm font-bold ${colorTheme.text}`}>{progress.percentage}%</span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${colorTheme.bgGradient} rounded-full transition-all duration-500`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <CheckCircleIcon size={14} className={colorTheme.text} />
            {progress.completed} of {progress.total} lessons completed
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
              Curriculum
            </p>
          </div>

          {modules.map((module, index) => {
            const moduleProgress = getModuleProgress(module);
            const isModuleActive = pathname === `/courses/${course.slug}/lessons/${module.id}` ||
              module.lessons.some(l => pathname === `/courses/${course.slug}/lessons/${l.id}`);

            return (
              <div key={module.id} className="mb-1 px-3">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left
                    transition-all duration-200
                    ${isModuleActive
                      ? `${colorTheme.light} border ${colorTheme.border}`
                      : 'hover:bg-gray-50 border border-transparent'
                    }
                  `}
                >
                  {/* Module number badge */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0
                    ${moduleProgress === 100
                      ? `${colorTheme.bg} text-white`
                      : isModuleActive
                        ? `${colorTheme.light} ${colorTheme.text}`
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {moduleProgress === 100 ? (
                      <CheckIcon size={16} />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Module title and progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ModuleIcon size={18} className={isModuleActive ? colorTheme.text : 'text-gray-400'} />
                      <span className={`
                        text-sm font-medium truncate
                        ${isModuleActive ? colorTheme.text : 'text-gray-700'}
                      `}>
                        {module.title}
                      </span>
                    </div>
                    {module.lessons.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorTheme.bg} rounded-full transition-all duration-300`}
                            style={{ width: `${moduleProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {moduleProgress}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expand icon */}
                  <ChevronRightIcon
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                      expandedModules.has(module.id) ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Lessons */}
                {expandedModules.has(module.id) && module.lessons.length > 0 && (
                  <div className="ml-5 pl-6 border-l-2 border-gray-100 mt-1 mb-2 space-y-0.5">
                    {module.lessons.map((lesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        courseSlug={course.slug}
                        isActive={pathname === `/courses/${course.slug}/lessons/${lesson.id}`}
                        completed={isComplete(lesson.id)}
                        colorTheme={colorTheme}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer - Quick links */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <Link
            href={`/courses/${course.slug}`}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              transition-colors
              ${pathname === `/courses/${course.slug}`
                ? `bg-white ${colorTheme.text} font-medium shadow-sm`
                : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }
            `}
          >
            <HomeIcon size={20} />
            Course Home
          </Link>

          {/* Help link */}
          <a
            href="https://www.bamboobicycleclub.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors mt-1"
          >
            <HelpIcon size={20} />
            Help & Support
          </a>
        </div>
      </aside>
    </>
  );
});
