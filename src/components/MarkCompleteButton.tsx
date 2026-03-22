'use client';

import React from 'react';
import { useProgress } from '@/context/ProgressContext';
import { CheckFilledIcon, CheckIcon } from '@/components/Icons';

interface MarkCompleteButtonProps {
  lessonId: string;
}

export default function MarkCompleteButton({ lessonId }: MarkCompleteButtonProps) {
  const { isComplete, toggleComplete } = useProgress();
  const completed = isComplete(lessonId);

  return (
    <button
      onClick={() => toggleComplete(lessonId)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
        ${completed
          ? 'bg-[var(--bamboo-100)] text-[var(--forest)] hover:bg-[var(--bamboo-200)]'
          : 'bg-[var(--gold)] text-[var(--forest)] hover:brightness-110'
        }
      `}
    >
      {completed ? (
        <>
          <CheckFilledIcon size={20} />
          Completed
        </>
      ) : (
        <>
          <CheckIcon size={20} />
          Mark as Complete
        </>
      )}
    </button>
  );
}
