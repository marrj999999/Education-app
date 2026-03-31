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
        flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all shadow-sm
        ${completed
          ? 'bg-white/20 text-white hover:bg-white/30'
          : 'bg-gold text-forest hover:bg-gold/90'
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
