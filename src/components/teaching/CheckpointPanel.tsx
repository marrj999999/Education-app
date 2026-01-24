'use client';

import { useState, useEffect } from 'react';
import { ClipboardCheck, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { CheckpointSection } from '@/lib/types/content';

interface CheckpointPanelProps {
  checkpoints: CheckpointSection[];
  lessonId: string;
}

export function CheckpointPanel({ checkpoints, lessonId }: CheckpointPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const storageKey = `teaching-checkpoints-${lessonId}`;

  // Load checked state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCheckedItems(new Set(JSON.parse(saved)));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [storageKey]);

  // Save checked state to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...checkedItems]));
  }, [checkedItems, storageKey]);

  // Flatten all checkpoint items
  const allItems = checkpoints.flatMap((cp) =>
    cp.items.map((item, index) => ({
      id: `${cp.id}-${index}`,
      text: item.criterion,
      checkpointTitle: cp.title,
    }))
  );

  const totalItems = allItems.length;
  const completedItems = allItems.filter((item) => checkedItems.has(item.id)).length;

  if (checkpoints.length === 0) {
    return null;
  }

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div
      className={`
        fixed bottom-20 right-4 z-30
        transition-all duration-300
        ${isExpanded ? 'w-80' : 'w-auto'}
      `}
    >
      {/* Collapsed view */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="
            flex items-center gap-2 px-4 py-3
            bg-purple-600 text-white rounded-full shadow-lg
            hover:bg-purple-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
          "
        >
          <ClipboardCheck size={20} />
          <span className="font-medium">
            {completedItems}/{totalItems}
          </span>
          <ChevronUp size={18} />
        </button>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-600 text-white">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={20} />
              <span className="font-semibold">Checkpoints</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-200">
                {completedItems}/{totalItems}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-purple-500 rounded transition-colors"
                aria-label="Collapse checkpoints"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Checkpoint list */}
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {allItems.map((item) => {
              const isChecked = checkedItems.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg text-left
                    transition-colors min-h-[44px]
                    ${isChecked
                      ? 'bg-green-50 text-green-800'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <div
                    className={`
                      flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                      ${isChecked
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                      }
                    `}
                  >
                    {isChecked && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-sm ${isChecked ? 'line-through' : ''}`}>
                    {item.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="px-3 pb-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
