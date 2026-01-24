'use client';

import { useState } from 'react';
import { CheckIcon } from '@/components/Icons';

interface Criterion {
  id: string;
  text: string;
  required?: boolean;
}

interface AssessmentCriteriaProps {
  criteria: Criterion[];
  editable?: boolean;
  onCriteriaChange?: (id: string, checked: boolean) => void;
}

export default function AssessmentCriteria({
  criteria,
  editable = false,
  onCriteriaChange,
}: AssessmentCriteriaProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (!criteria?.length) return null;

  const handleToggle = (id: string) => {
    if (!editable) return;
    const newValue = !checked[id];
    setChecked(prev => ({ ...prev, [id]: newValue }));
    onCriteriaChange?.(id, newValue);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 print:break-inside-avoid">
      <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <CheckIcon size={18} className="text-amber-700" /> Assessment Criteria
      </h3>
      <div className="space-y-2">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              checked[criterion.id]
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-amber-100'
            } ${editable ? 'cursor-pointer hover:border-amber-300' : ''}`}
            onClick={() => handleToggle(criterion.id)}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                checked[criterion.id]
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {checked[criterion.id] && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <span className={`text-gray-700 ${checked[criterion.id] ? 'line-through opacity-60' : ''}`}>
              {criterion.text}
              {criterion.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {criteria.some(c => c.required) && (
        <p className="text-xs text-amber-700 mt-3">
          * Required criteria must be met to pass
        </p>
      )}
    </div>
  );
}
