'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SectionNavigatorProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentLabel: string;
}

export function SectionNavigator({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentLabel,
}: SectionNavigatorProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border shadow-lg z-40">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Current section label */}
        <div className="text-center text-sm text-text-tertiary mb-2 truncate">
          {currentLabel}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {/* Previous button */}
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className={`
              flex-1 flex items-center justify-center gap-2
              min-h-[56px] rounded-xl font-medium text-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-info
              ${hasPrevious
                ? 'bg-surface-hover text-text-secondary hover:bg-surface-active active:bg-surface-active'
                : 'bg-surface-hover text-text-tertiary cursor-not-allowed'
              }
            `}
            aria-label="Previous section"
          >
            <ChevronLeft size={24} />
            <span className="hidden sm:inline">Previous</span>
            <kbd className="hidden lg:inline-block ml-2 px-2 py-0.5 text-xs bg-surface rounded border border-border text-text-tertiary">
              ←
            </kbd>
          </button>

          {/* Next button */}
          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`
              flex-1 flex items-center justify-center gap-2
              min-h-[56px] rounded-xl font-medium text-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-info
              ${hasNext
                ? 'bg-info text-white hover:bg-info active:bg-info-dark'
                : 'bg-surface-hover text-text-tertiary cursor-not-allowed'
              }
            `}
            aria-label="Next section"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={24} />
            <kbd className="hidden lg:inline-block ml-2 px-2 py-0.5 text-xs bg-info rounded border border-info-medium text-white">
              →
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
