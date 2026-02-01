'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, CheckSquare, Square, Package, Wrench, HardHat, ClipboardList } from 'lucide-react';
import type { ChecklistSection } from '@/lib/types/content';

interface PrepChecklistProps {
  sections: ChecklistSection[];
  lessonId: string;
}

type Category = 'materials' | 'tools' | 'equipment' | 'preparation';

interface ChecklistItem {
  text: string;
  quantity?: string;
  sectionId: string;
  category: Category;
}

export function PrepChecklist({ sections, lessonId }: PrepChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const storageKey = `prep-checklist-${lessonId}`;

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify([...checked]));
    }
  }, [checked, storageKey]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<Category, ChecklistItem[]> = {
      materials: [],
      tools: [],
      equipment: [],
      preparation: [],
    };

    sections.forEach((section) => {
      section.items.forEach((item) => {
        const key = `${section.id}-${item.text}`;
        groups[section.category].push({
          text: item.text,
          quantity: item.quantity,
          sectionId: section.id,
          category: section.category,
        });
      });
    });

    return groups;
  }, [sections]);

  const toggleItem = (sectionId: string, text: string) => {
    const key = `${sectionId}-${text}`;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const checkAll = (category: Category) => {
    setChecked((prev) => {
      const next = new Set(prev);
      groupedItems[category].forEach((item) => {
        next.add(`${item.sectionId}-${item.text}`);
      });
      return next;
    });
  };

  const uncheckAll = (category: Category) => {
    setChecked((prev) => {
      const next = new Set(prev);
      groupedItems[category].forEach((item) => {
        next.delete(`${item.sectionId}-${item.text}`);
      });
      return next;
    });
  };

  const categoryIcons: Record<Category, typeof Package> = {
    materials: Package,
    tools: Wrench,
    equipment: HardHat,
    preparation: ClipboardList,
  };

  const categoryColors: Record<Category, string> = {
    materials: 'border-blue-500 bg-blue-50',
    tools: 'border-orange-500 bg-orange-50',
    equipment: 'border-purple-500 bg-purple-50',
    preparation: 'border-green-500 bg-green-50',
  };

  const categoryTitles: Record<Category, string> = {
    materials: 'Materials',
    tools: 'Tools',
    equipment: 'Equipment',
    preparation: 'Preparation',
  };

  // Total counts
  const totalItems = Object.values(groupedItems).flat().length;
  const checkedCount = checked.size;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Preparation Checklist</h2>
          <span
            className={`
              text-sm font-medium px-3 py-1 rounded-full
              ${checkedCount === totalItems
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            {checkedCount} of {totalItems} complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Category Sections */}
      {(Object.keys(groupedItems) as Category[]).map((category) => {
        const items = groupedItems[category];
        if (items.length === 0) return null;

        const Icon = categoryIcons[category];
        const categoryChecked = items.filter((item) =>
          checked.has(`${item.sectionId}-${item.text}`)
        ).length;
        const allChecked = categoryChecked === items.length;

        return (
          <div
            key={category}
            className={`
              border rounded-lg overflow-hidden border-l-4
              ${categoryColors[category]}
            `}
          >
            {/* Category Header */}
            <div className="bg-white border-b border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="text-gray-600" size={20} />
                  <h3 className="font-semibold text-gray-900">{categoryTitles[category]}</h3>
                  <span className="text-sm text-gray-500">
                    {categoryChecked} of {items.length}
                  </span>
                </div>

                {/* Check/Uncheck All */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => checkAll(category)}
                    className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Check All
                  </button>
                  <button
                    onClick={() => uncheckAll(category)}
                    className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Uncheck All
                  </button>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white p-4">
              <ul className="space-y-2">
                {items.map((item, index) => {
                  const key = `${item.sectionId}-${item.text}`;
                  const isChecked = checked.has(key);

                  return (
                    <li key={index}>
                      <button
                        onClick={() => toggleItem(item.sectionId, item.text)}
                        className={`
                          w-full flex items-center gap-3 text-left p-3 rounded-lg
                          min-h-[44px] transition-all duration-150
                          ${isChecked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
                        `}
                        aria-pressed={isChecked}
                      >
                        {/* Checkbox */}
                        <span
                          className={`
                            flex-shrink-0 w-6 h-6 rounded flex items-center justify-center
                            transition-all duration-200
                            ${isChecked
                              ? 'bg-green-500 text-white scale-110'
                              : 'border-2 border-gray-300 text-transparent'
                            }
                          `}
                        >
                          <Check size={16} strokeWidth={3} />
                        </span>

                        {/* Text */}
                        <span
                          className={`
                            flex-1 text-base
                            ${isChecked ? 'text-gray-500 line-through' : 'text-gray-900'}
                          `}
                        >
                          {item.text}
                        </span>

                        {/* Quantity */}
                        {item.quantity && (
                          <span className="flex-shrink-0 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-sm font-medium">
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
      })}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .prep-checklist button {
            pointer-events: none;
          }
        }
      `}</style>
    </div>
  );
}
