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
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    Icon: LightbulbIcon,
    title: 'Instructor Tip',
    text: 'text-blue-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    Icon: WarningIcon,
    title: 'Safety Warning',
    text: 'text-amber-800',
  },
  issue: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    Icon: WrenchIcon,
    title: 'Common Issue',
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    Icon: InfoIcon,
    title: 'Note',
    text: 'text-gray-700',
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
