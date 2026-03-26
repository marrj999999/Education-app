'use client';

import { useState, useEffect } from 'react';
import { Check, ClipboardCheck } from 'lucide-react';
import type { CheckpointSection } from '@/lib/types/content';
import { InlineEditable } from '@/components/editing/InlineEditable';

interface CheckpointListProps {
  section: CheckpointSection;
  storageKey?: string;
  variant?: 'compact' | 'large';
}

export function CheckpointList({ section, storageKey, variant = 'compact' }: CheckpointListProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const isLarge = variant === 'large';

  // Load from localStorage if key provided
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setChecked(new Set(JSON.parse(saved)));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [storageKey]);

  // Save to localStorage when changed
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify([...checked]));
    }
  }, [checked, storageKey]);

  const toggleItem = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const completedCount = checked.size;
  const totalCount = section.items.length;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden border-l-4 border-l-assess">
      {/* Header */}
      <div className={`border-b border-border ${isLarge ? 'p-5' : 'p-4'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="text-assess" size={isLarge ? 24 : 20} />
            <InlineEditable
              sectionId={section.id}
              field="title"
              as="h3"
              className={`font-semibold text-text-primary ${isLarge ? 'text-lg' : 'text-base'}`}
            >
              {section.title}
            </InlineEditable>
          </div>
          <span
            className={`
              text-sm font-medium
              ${completedCount === totalCount ? 'text-success' : 'text-text-tertiary'}
            `}
          >
            {completedCount} of {totalCount} verified
          </span>
        </div>
      </div>

      {/* Items */}
      <div className={isLarge ? 'p-5' : 'p-4'}>
        <ul className="space-y-2">
          {section.items.map((item, index) => {
            const isChecked = checked.has(index);

            return (
              <li key={index}>
                <button
                  onClick={() => toggleItem(index)}
                  className={`
                    w-full flex items-start gap-3 text-left rounded-lg
                    transition-all duration-150
                    ${isLarge ? 'p-3 min-h-[52px]' : 'p-2 min-h-[44px]'}
                    ${isChecked ? 'bg-success-light hover:bg-success-light' : 'hover:bg-surface-hover'}
                  `}
                  aria-pressed={isChecked}
                >
                  {/* Checkbox */}
                  <span
                    className={`
                      flex-shrink-0 flex items-center justify-center rounded mt-0.5
                      transition-all duration-200
                      ${isLarge ? 'w-6 h-6' : 'w-5 h-5'}
                      ${isChecked
                        ? 'bg-success text-white scale-110'
                        : 'border-2 border-border text-transparent'
                      }
                    `}
                  >
                    <Check size={isLarge ? 16 : 14} strokeWidth={3} />
                  </span>

                  {/* Content */}
                  <div className="flex-1">
                    <InlineEditable
                      sectionId={section.id}
                      field={`items[${index}].criterion`}
                      as="span"
                      className={`
                        block font-medium
                        ${isLarge ? 'text-base' : 'text-sm'}
                        ${isChecked ? 'text-text-tertiary line-through' : 'text-text-primary'}
                      `}
                    >
                      {item.criterion}
                    </InlineEditable>
                    {item.description && (
                      <InlineEditable
                        sectionId={section.id}
                        field={`items[${index}].description`}
                        as="span"
                        className={`
                          block text-text-tertiary mt-0.5
                          ${isLarge ? 'text-sm' : 'text-xs'}
                          ${isChecked ? 'line-through' : ''}
                        `}
                      >
                        {item.description}
                      </InlineEditable>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
