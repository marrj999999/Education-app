'use client';

import { Lightbulb } from 'lucide-react';

interface InstructorNotesCardProps {
  children: React.ReactNode;
}

export function InstructorNotesCard({ children }: InstructorNotesCardProps) {
  return (
    <div className="border-l-4 border-l-steel bg-steel/10 rounded-r-xl p-5 shadow-sm">
      <div className="font-bold text-steel mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
        <Lightbulb size={16} className="text-steel fill-steel/20" />
        Instructor Notes
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
