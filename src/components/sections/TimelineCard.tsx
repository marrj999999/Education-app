'use client';

import { Clock, Timer } from 'lucide-react';
import type { TimelineSection } from '@/lib/types/content';
import { cn } from '@/lib/utils';
import { InlineEditable } from '@/components/editing/InlineEditable';

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
        <InlineEditable
          sectionId={section.id}
          field="title"
          as="h3"
          className={cn(
            'font-semibold text-text-primary',
            isPresentation
              ? 'text-present-heading'
              : isLarge
                ? 'text-xl'
                : 'text-lg'
          )}
        >
          {section.title}
        </InlineEditable>
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
              'bg-surface border border-border border-t-[3px] border-t-teal rounded-2xl',
              'shadow-sm hover:shadow-md transition-shadow duration-200',
              isPresentation ? 'p-6' : isLarge ? 'p-5' : 'p-4'
            )}
          >
            {/* Time and Duration Badges */}
            <div className="flex items-center gap-2 mb-3">
              {/* Time Badge - Pill shape, blue */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 bg-info text-white rounded-full font-mono font-semibold',
                  isPresentation
                    ? 'px-4 py-2 text-lg'
                    : isLarge
                      ? 'px-3 py-1.5 text-sm'
                      : 'px-2.5 py-1 text-xs'
                )}
              >
                <Clock size={isPresentation ? 18 : isLarge ? 14 : 12} />
                <InlineEditable sectionId={section.id} field={`rows[${index}].time`} as="span">
                  {row.time}
                </InlineEditable>
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
                  <InlineEditable sectionId={section.id} field={`rows[${index}].duration`} as="span">
                    {row.duration}
                  </InlineEditable>
                </span>
              )}
            </div>

            {/* Activity Name - Bold */}
            <InlineEditable
              sectionId={section.id}
              field={`rows[${index}].activity`}
              as="h4"
              className={cn(
                'font-bold text-text-primary',
                isPresentation
                  ? 'text-xl mb-2'
                  : isLarge
                    ? 'text-lg mb-1'
                    : 'text-base mb-1'
              )}
            >
              {row.activity}
            </InlineEditable>

            {/* Notes */}
            {row.notes && (
              <InlineEditable
                sectionId={section.id}
                field={`rows[${index}].notes`}
                as="p"
                className={cn(
                  'text-text-secondary leading-relaxed',
                  isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
                )}
                multiline
              >
                {row.notes}
              </InlineEditable>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div
        className={cn(
          'flex items-center gap-2 text-text-tertiary pt-2',
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
