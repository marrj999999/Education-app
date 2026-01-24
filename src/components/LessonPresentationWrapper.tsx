'use client';

import { useState, useEffect, ReactNode } from 'react';
import { PresentationToggle } from '@/components/teaching';
import { cn } from '@/lib/utils';

interface LessonPresentationWrapperProps {
  children: ReactNode;
  actionSlot?: ReactNode;
  actionButtons?: ReactNode;
}

export function LessonPresentationWrapper({
  children,
  actionSlot,
  actionButtons
}: LessonPresentationWrapperProps) {
  const [isPresentation, setIsPresentation] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Escape key handler to exit presentation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentation) {
        setIsPresentation(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentation]);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isPresentation && isDarkMode && "bg-slate-900"
    )}>
      {/* Action bar with presentation toggle */}
      <div className={cn(
        "sticky top-14 z-20 backdrop-blur-sm border-b",
        isPresentation && isDarkMode
          ? "bg-slate-800/95 border-slate-700"
          : "bg-white/95 border-gray-100"
      )}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Original action slot (lesson progress) */}
            <div className={cn(
              isPresentation && isDarkMode && "text-slate-300"
            )}>
              {actionSlot}
            </div>

            {/* Action buttons including presentation toggle */}
            <div className="flex items-center gap-2">
              {actionButtons}
              <PresentationToggle
                isPresentation={isPresentation}
                onToggle={() => setIsPresentation(!isPresentation)}
                isDarkMode={isDarkMode}
                onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content with presentation typography when active */}
      <div className={cn(
        "transition-all duration-300",
        isPresentation && "text-present-body",
        isPresentation && "[&_h1]:text-present-heading [&_h2]:text-present-heading [&_h3]:text-xl",
        isPresentation && "[&_.notion-content]:text-present-body",
        isPresentation && "[&_.notion-content_h1]:text-present-heading",
        isPresentation && "[&_.notion-content_h2]:text-present-heading",
        isPresentation && "[&_.notion-content_p]:text-present-body",
        isPresentation && isDarkMode && "text-slate-100",
        isPresentation && isDarkMode && "[&_.bg-white]:bg-slate-800",
        isPresentation && isDarkMode && "[&_.text-gray-900]:text-slate-100",
        isPresentation && isDarkMode && "[&_.text-gray-700]:text-slate-300",
        isPresentation && isDarkMode && "[&_.text-gray-600]:text-slate-400",
        isPresentation && isDarkMode && "[&_.border-gray-100]:border-slate-700",
        isPresentation && isDarkMode && "[&_.border-gray-200]:border-slate-600"
      )}>
        {children}
      </div>
    </div>
  );
}

export default LessonPresentationWrapper;
