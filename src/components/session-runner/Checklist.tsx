'use client';

import { useEffect } from 'react';
import { useSessionRunner } from './SessionRunnerContext';

interface ChecklistProps {
  blockId: string;
  title?: string;
  items: string[];
  initialState?: { index: number; completed: boolean }[];
}

export function Checklist({ blockId, title, items, initialState = [] }: ChecklistProps) {
  const { state, initChecklist, toggleChecklistItem } = useSessionRunner();

  // Initialize checklist on mount
  useEffect(() => {
    const itemsWithState = items.map((text, index) => ({
      index,
      text,
      completed: initialState.find((s) => s.index === index)?.completed || false,
    }));
    initChecklist(blockId, itemsWithState);
  }, [blockId, items, initialState, initChecklist]);

  const checklistState = state.checklists[blockId];
  const checklistItems = checklistState?.items || [];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title || 'Checklist'}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {completedCount} / {totalCount}
            </span>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {checklistItems.map((item) => (
          <label
            key={item.index}
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleChecklistItem(blockId, item.index)}
                className="sr-only peer"
              />
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  item.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {item.completed && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span
              className={`flex-1 transition-all ${
                item.completed ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {/* Completion indicator */}
      {progress === 100 && (
        <div className="p-4 bg-green-50 border-t border-green-100">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">All items completed!</span>
          </div>
        </div>
      )}
    </div>
  );
}
