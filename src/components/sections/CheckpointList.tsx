'use client';

import { useState, useEffect } from 'react';
import { Check, ClipboardCheck } from 'lucide-react';
import type { CheckpointSection } from '@/lib/types/content';

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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden border-l-4 border-l-purple-500">
      {/* Header */}
      <div className={`border-b border-gray-100 ${isLarge ? 'p-5' : 'p-4'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="text-purple-600" size={isLarge ? 24 : 20} />
            <h3 className={`font-semibold text-gray-900 ${isLarge ? 'text-lg' : 'text-base'}`}>
              {section.title}
            </h3>
          </div>
          <span
            className={`
              text-sm font-medium
              ${completedCount === totalCount ? 'text-green-600' : 'text-gray-500'}
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
                    ${isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
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
                        ? 'bg-green-500 text-white scale-110'
                        : 'border-2 border-gray-300 text-transparent'
                      }
                    `}
                  >
                    <Check size={isLarge ? 16 : 14} strokeWidth={3} />
                  </span>

                  {/* Content */}
                  <div className="flex-1">
                    <span
                      className={`
                        block font-medium
                        ${isLarge ? 'text-base' : 'text-sm'}
                        ${isChecked ? 'text-gray-500 line-through' : 'text-gray-900'}
                      `}
                    >
                      {item.criterion}
                    </span>
                    {item.description && (
                      <span
                        className={`
                          block text-gray-500 mt-0.5
                          ${isLarge ? 'text-sm' : 'text-xs'}
                          ${isChecked ? 'line-through' : ''}
                        `}
                      >
                        {item.description}
                      </span>
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
