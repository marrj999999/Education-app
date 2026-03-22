'use client';

import type { ReactNode } from 'react';
import {
  LightbulbIcon,
  WarningIcon,
  WrenchIcon,
  InfoIcon,
} from '@/components/Icons';

type NoteType = 'tip' | 'warning' | 'issue' | 'info';

interface IconProps {
  className?: string;
  size?: number | string;
}

interface InstructorNoteProps {
  type: NoteType;
  title?: string;
  children: ReactNode;
}

const noteStyles: Record<NoteType, { bg: string; border: string; Icon: React.FC<IconProps>; title: string; text: string }> = {
  tip: {
    bg: 'bg-info-light',
    border: 'border-info-medium',
    Icon: LightbulbIcon,
    title: 'Instructor Tip',
    text: 'text-info-darker',
  },
  warning: {
    bg: 'bg-warning-light',
    border: 'border-warning-medium',
    Icon: WarningIcon,
    title: 'Safety Warning',
    text: 'text-warning-darker',
  },
  issue: {
    bg: 'bg-danger-light',
    border: 'border-danger-medium',
    Icon: WrenchIcon,
    title: 'Common Issue',
    text: 'text-danger-darker',
  },
  info: {
    bg: 'bg-surface-hover',
    border: 'border-border',
    Icon: InfoIcon,
    title: 'Note',
    text: 'text-text-secondary',
  },
};

export default function InstructorNote({ type, title, children }: InstructorNoteProps) {
  const style = noteStyles[type];

  return (
    <div className={`${style.bg} border-l-4 ${style.border} rounded-r-lg p-4 mb-4 print:break-inside-avoid`}>
      <div className={`font-semibold ${style.text} mb-1 flex items-center gap-2`}>
        <style.Icon size={20} className={style.text} />
        {title || style.title}
      </div>
      <div className={`${style.text} text-sm`}>{children}</div>
    </div>
  );
}
