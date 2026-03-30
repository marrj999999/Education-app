'use client';

import { Check } from 'lucide-react';
import type { ChecklistSection } from '@/lib/types/content';
import { cn } from '@/lib/utils';
import { InlineEditable } from '@/components/editing/InlineEditable';

interface ChecklistDisplayProps {
  section: ChecklistSection;
  checked: string[];
  onToggle: (item: string) => void;
  variant?: 'compact' | 'large' | 'teaching' | 'presentation';
}

export function ChecklistDisplay({
  section,
  checked,
  onToggle,
  variant = 'compact',
}: ChecklistDisplayProps) {
  const isLarge = variant === 'large' || variant === 'teaching' || variant === 'presentation';
  const isPresentation = variant === 'presentation';
  const completedCount = section.items.filter((item) => checked.includes(item.text)).length;
  const totalCount = section.items.length;
  const allChecked = completedCount === totalCount;

  // Category colors - using semantic borders
  const categoryColors: Record<string, string> = {
    materials: 'border-l-blue-500',
    tools: 'border-l-orange-500',
    equipment: 'border-l-assess',
    preparation: 'border-l-green-500',
  };

  const categoryBadgeColors: Record<string, string> = {
    materials: 'bg-info-light text-info-darker',
    tools: 'bg-orange-100 text-orange-800',
    equipment: 'bg-assess-light text-assess-darker',
    preparation: 'bg-success-light text-success-darker',
  };

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl overflow-hidden shadow-sm',
        'border-l-4',
        categoryColors[section.category] || 'border-l-border'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'border-b border-border',
          isPresentation ? 'p-6' : isLarge ? 'p-5' : 'p-4'
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <InlineEditable
              sectionId={section.id}
              field="title"
              as="h3"
              className={cn(
                'font-bold text-text-primary',
                isPresentation
                  ? 'text-present-heading'
                  : isLarge
                    ? 'text-lg'
                    : 'text-base'
              )}
            >
              {section.title}
            </InlineEditable>
            {/* Category Badge - uppercase, smaller text */}
            <span
              className={cn(
                'px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider',
                isPresentation ? 'text-sm' : 'text-xs',
                categoryBadgeColors[section.category] || 'bg-surface-hover text-text-primary'
              )}
            >
              {section.category}
            </span>
          </div>

          {/* Progress Counter */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-medium',
                isPresentation ? 'text-lg' : 'text-sm',
                allChecked ? 'text-success' : 'text-text-tertiary'
              )}
            >
              {completedCount} of {totalCount} complete
            </span>
            {allChecked && (
              <span
                className={cn(
                  'flex items-center justify-center bg-success text-white rounded-full',
                  isPresentation ? 'w-7 h-7' : 'w-5 h-5'
                )}
              >
                <Check size={isPresentation ? 16 : 12} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={cn(isPresentation ? 'p-6' : isLarge ? 'p-5' : 'p-4')}>
        <ul className={cn('space-y-2 list-none', isPresentation && 'space-y-3')}>
          {section.items.map((item, index) => {
            const isChecked = checked.includes(item.text);

            return (
              <li key={index} className="checklist-item">
                <button
                  onClick={() => onToggle(item.text)}
                  className={cn(
                    'w-full flex items-center gap-4 text-left',
                    'rounded-lg transition-all duration-200 group',
                    // Minimum touch target size 44px
                    isPresentation
                      ? 'p-4 min-h-[56px]'
                      : isLarge
                        ? 'p-3 min-h-[52px]'
                        : 'p-2.5 min-h-[44px]',
                    isChecked ? 'bg-success-light hover:bg-success-light' : 'hover:bg-surface-hover'
                  )}
                  aria-pressed={isChecked}
                >
                  {/* Checkbox - 24px minimum size with animation */}
                  <span
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center',
                      'rounded-full transition-all duration-200 ease-out',
                      // Size: 24px minimum (w-6 h-6)
                      isPresentation ? 'w-8 h-8' : 'w-6 h-6',
                      isChecked
                        ? 'bg-success text-white scale-110'
                        : 'border-2 border-teal/30 bg-teal/5 text-transparent rounded-full group-hover:border-teal group-hover:bg-teal/10'
                    )}
                  >
                    <Check
                      size={isPresentation ? 20 : 16}
                      strokeWidth={3}
                      className="transition-transform duration-150"
                    />
                  </span>

                  {/* Item Text - with strikethrough when checked */}
                  <InlineEditable
                    sectionId={section.id}
                    field={`items[${index}].text`}
                    as="span"
                    className={cn(
                      'flex-1 transition-all duration-200',
                      isPresentation
                        ? 'text-lg'
                        : isLarge
                          ? 'text-base'
                          : 'text-sm',
                      isChecked ? 'text-text-tertiary line-through' : 'text-text-primary'
                    )}
                  >
                    {item.text}
                  </InlineEditable>

                  {/* Quantity Badge */}
                  {item.quantity && (
                    <span
                      className={cn(
                        'flex-shrink-0 bg-surface-hover text-text-secondary rounded-full font-medium',
                        isPresentation
                          ? 'px-4 py-1.5 text-base'
                          : isLarge
                            ? 'px-3 py-1 text-sm'
                            : 'px-2.5 py-0.5 text-xs'
                      )}
                    >
                      x{item.quantity}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
