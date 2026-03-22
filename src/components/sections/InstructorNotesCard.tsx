'use client';

import { Lightbulb } from 'lucide-react';

interface InstructorNotesCardProps {
  children: React.ReactNode;
}

export function InstructorNotesCard({ children }: InstructorNotesCardProps) {
  return (
    <div className="border-l-4 border-l-steel bg-steel/5 rounded-r-lg p-4">
      <div className="font-semibold text-text-secondary mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
        <Lightbulb size={16} className="text-steel" />
        Instructor Notes
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
