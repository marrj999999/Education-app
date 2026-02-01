'use client';

import { Check } from 'lucide-react';
import type { ChecklistSection } from '@/lib/types/content';
import { cn } from '@/lib/utils';

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
    equipment: 'border-l-purple-500',
    preparation: 'border-l-green-500',
  };

  const categoryBadgeColors: Record<string, string> = {
    materials: 'bg-blue-100 text-blue-800',
    tools: 'bg-orange-100 text-orange-800',
    equipment: 'bg-purple-100 text-purple-800',
    preparation: 'bg-green-100 text-green-800',
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm',
        'border-l-4',
        categoryColors[section.category] || 'border-l-gray-500'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'border-b border-gray-100',
          isPresentation ? 'p-6' : isLarge ? 'p-5' : 'p-4'
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3
              className={cn(
                'font-bold text-gray-900',
                isPresentation
                  ? 'text-present-heading'
                  : isLarge
                    ? 'text-lg'
                    : 'text-base'
              )}
            >
              {section.title}
            </h3>
            {/* Category Badge - uppercase, smaller text */}
            <span
              className={cn(
                'px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider',
                isPresentation ? 'text-sm' : 'text-xs',
                categoryBadgeColors[section.category] || 'bg-gray-100 text-gray-800'
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
                allChecked ? 'text-green-600' : 'text-gray-500'
              )}
            >
              {completedCount} of {totalCount} complete
            </span>
            {allChecked && (
              <span
                className={cn(
                  'flex items-center justify-center bg-green-500 text-white rounded-full',
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
        <ul className={cn('space-y-2', isPresentation && 'space-y-3')}>
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
                    isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                  )}
                  aria-pressed={isChecked}
                >
                  {/* Checkbox - 24px minimum size with animation */}
                  <span
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center',
                      'rounded transition-all duration-200 ease-out',
                      // Size: 24px minimum (w-6 h-6)
                      isPresentation ? 'w-8 h-8' : 'w-6 h-6',
                      isChecked
                        ? 'bg-green-500 text-white scale-110'
                        : 'border-2 border-gray-300 text-transparent group-hover:border-green-400'
                    )}
                  >
                    <Check
                      size={isPresentation ? 20 : 16}
                      strokeWidth={3}
                      className="transition-transform duration-150"
                    />
                  </span>

                  {/* Item Text - with strikethrough when checked */}
                  <span
                    className={cn(
                      'flex-1 transition-all duration-200',
                      isPresentation
                        ? 'text-lg'
                        : isLarge
                          ? 'text-base'
                          : 'text-sm',
                      isChecked ? 'text-gray-400 line-through' : 'text-gray-900'
                    )}
                  >
                    {item.text}
                  </span>

                  {/* Quantity Badge */}
                  {item.quantity && (
                    <span
                      className={cn(
                        'flex-shrink-0 bg-gray-100 text-gray-700 rounded-full font-medium',
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
