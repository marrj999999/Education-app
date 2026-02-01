'use client';

import { Clock, Timer } from 'lucide-react';
import type { TimelineSection } from '@/lib/types/content';
import { cn } from '@/lib/utils';

interface TimelineCardProps {
  section: TimelineSection;
  variant?: 'compact' | 'large' | 'teaching' | 'presentation';
}

export function TimelineCard({ section, variant = 'compact' }: TimelineCardProps) {
  const isLarge = variant === 'large' || variant === 'teaching' || variant === 'presentation';
  const isPresentation = variant === 'presentation';

  return (
    <div className="space-y-4">
      {section.title && (
        <h3
          className={cn(
            'font-semibold text-gray-900',
            isPresentation
              ? 'text-present-heading'
              : isLarge
                ? 'text-xl'
                : 'text-lg'
          )}
        >
          {section.title}
        </h3>
      )}

      {/* Card Grid Layout */}
      <div
        className={cn(
          'grid gap-4',
          isPresentation ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {section.rows.map((row, index) => (
          <div
            key={index}
            className={cn(
              'bg-white border border-gray-200 rounded-xl overflow-hidden',
              'shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200',
              isPresentation ? 'p-6' : isLarge ? 'p-5' : 'p-4'
            )}
          >
            {/* Time and Duration Badges */}
            <div className="flex items-center gap-2 mb-3">
              {/* Time Badge - Pill shape, blue */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-full font-mono font-semibold',
                  isPresentation
                    ? 'px-4 py-2 text-lg'
                    : isLarge
                      ? 'px-3 py-1.5 text-sm'
                      : 'px-2.5 py-1 text-xs'
                )}
              >
                <Clock size={isPresentation ? 18 : isLarge ? 14 : 12} />
                {row.time}
              </span>

              {/* Duration Badge - Pill shape, slate */}
              {row.duration && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 bg-slate-200 text-slate-700 rounded-full font-medium',
                    isPresentation
                      ? 'px-4 py-2 text-base'
                      : isLarge
                        ? 'px-3 py-1 text-sm'
                        : 'px-2 py-0.5 text-xs'
                  )}
                >
                  <Timer size={isPresentation ? 16 : isLarge ? 14 : 12} />
                  {row.duration}
                </span>
              )}
            </div>

            {/* Activity Name - Bold */}
            <h4
              className={cn(
                'font-bold text-gray-900',
                isPresentation
                  ? 'text-xl mb-2'
                  : isLarge
                    ? 'text-lg mb-1'
                    : 'text-base mb-1'
              )}
            >
              {row.activity}
            </h4>

            {/* Notes */}
            {row.notes && (
              <p
                className={cn(
                  'text-gray-600 leading-relaxed',
                  isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
                )}
              >
                {row.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div
        className={cn(
          'flex items-center gap-2 text-gray-500 pt-2',
          isPresentation ? 'text-lg' : 'text-sm'
        )}
      >
        <Clock size={isPresentation ? 20 : 16} />
        <span>
          {section.rows.length} {section.rows.length === 1 ? 'activity' : 'activities'}
        </span>
      </div>
    </div>
  );
}
