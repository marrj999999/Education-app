'use client';

import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';
import type { SafetySection } from '@/lib/types/content';
import { cn } from '@/lib/utils';

interface SafetyCalloutProps {
  section: SafetySection;
  variant?: 'compact' | 'large' | 'teaching' | 'presentation';
}

export function SafetyCallout({ section, variant = 'compact' }: SafetyCalloutProps) {
  const isLarge = variant === 'large' || variant === 'teaching' || variant === 'presentation';
  const isPresentation = variant === 'presentation';

  // Icon by level
  const IconComponent = {
    critical: AlertOctagon,
    warning: AlertTriangle,
    caution: AlertCircle,
  }[section.level];

  // Get icon color based on level
  const iconColors = {
    critical: 'text-red-600',
    warning: 'text-amber-600',
    caution: 'text-yellow-600',
  };

  // Get badge styles based on level
  const badgeStyles = {
    critical: 'bg-red-200 text-red-900',
    warning: 'bg-amber-200 text-amber-900',
    caution: 'bg-yellow-200 text-yellow-900',
  };

  return (
    <div
      className={cn(
        // Base styles with 4px left border
        'rounded-lg border-l-4 overflow-hidden',
        // Use semantic safety classes from globals.css
        `safety-${section.level}`,
        // Padding based on variant
        isPresentation ? 'p-8' : isLarge ? 'p-6' : 'p-4'
      )}
      role="alert"
      aria-label={`${section.level} safety warning`}
    >
      <div className={cn('flex', isPresentation ? 'gap-6' : 'gap-4')}>
        {/* Icon */}
        <div className={cn('flex-shrink-0', iconColors[section.level])}>
          <IconComponent
            size={isPresentation ? 40 : isLarge ? 32 : 24}
            strokeWidth={2}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with level badge */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            {section.title && (
              <h3
                className={cn(
                  'font-bold',
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
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                badgeStyles[section.level]
              )}
            >
              {section.level}
            </span>
          </div>

          {/* Main content */}
          <p
            className={cn(
              'leading-relaxed',
              isPresentation
                ? 'text-present-body'
                : isLarge
                  ? 'text-teaching-body'
                  : 'text-base'
            )}
          >
            {section.content}
          </p>

          {/* Additional items */}
          {section.items && section.items.length > 0 && (
            <ul className={cn('mt-4 space-y-2')}>
              {section.items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-1">
                    <AlertTriangle size={isPresentation ? 18 : 14} />
                  </span>
                  <span
                    className={cn(
                      isPresentation
                        ? 'text-lg'
                        : isLarge
                          ? 'text-base'
                          : 'text-sm'
                    )}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
