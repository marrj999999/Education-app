'use client';

import { useState } from 'react';
import type { RichText } from '@/lib/types';

interface NotionToDoProps {
  richText: RichText[];
  initialChecked: boolean;
  renderRichText: (richText: RichText[]) => React.ReactNode;
}

export default function NotionToDo({ richText, initialChecked, renderRichText }: NotionToDoProps) {
  const [checked, setChecked] = useState(initialChecked);

  return (
    <div
      className="flex items-start gap-3 mb-2 p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
      onClick={() => setChecked(!checked)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setChecked(!checked);
        }
      }}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
          checked
            ? 'bg-teal border-teal text-white'
            : 'border-border bg-surface hover:border-text-tertiary'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={`flex-1 ${checked ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>
        {renderRichText(richText)}
      </span>
    </div>
  );
}
