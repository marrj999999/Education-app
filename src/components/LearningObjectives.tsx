'use client';

import { TargetIcon } from '@/components/Icons';

interface LearningObjectivesProps {
  objectives: string[];
  title?: string;
}

export default function LearningObjectives({
  objectives,
  title = "What you'll learn"
}: LearningObjectivesProps) {
  if (!objectives?.length) return null;

  return (
    <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-5 mb-6 print:break-inside-avoid">
      <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
        <TargetIcon size={20} className="text-green-600" />
        {title}
      </h3>
      <ul className="space-y-2">
        {objectives.map((obj, i) => (
          <li key={i} className="flex items-start gap-3 text-green-700">
            <span className="w-5 h-5 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
