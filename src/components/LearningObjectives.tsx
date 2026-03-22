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
    <div className="bg-[var(--bamboo-50)] border-l-4 border-[var(--teal)] rounded-r-lg p-5 mb-6 print:break-inside-avoid">
      <h3 className="font-semibold text-[var(--forest)] mb-3 flex items-center gap-2">
        <TargetIcon size={20} className="text-[var(--teal)]" />
        {title}
      </h3>
      <ul className="space-y-2">
        {objectives.map((obj, i) => (
          <li key={i} className="flex items-start gap-3 text-[var(--teal)]">
            <span className="w-5 h-5 rounded-full bg-[var(--bamboo-200)] text-[var(--forest)] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
