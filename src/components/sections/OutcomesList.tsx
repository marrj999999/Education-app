'use client';

import { Target, CheckCircle2 } from 'lucide-react';
import type { OutcomesSection } from '@/lib/types/content';

interface OutcomesListProps {
  section: OutcomesSection;
  variant?: 'compact' | 'large';
}

export function OutcomesList({ section, variant = 'compact' }: OutcomesListProps) {
  const isLarge = variant === 'large';

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`border-b border-green-200 ${isLarge ? 'p-5' : 'p-4'}`}>
        <div className="flex items-center gap-3">
          <Target className="text-green-600" size={isLarge ? 24 : 20} />
          <h3 className={`font-semibold text-green-900 ${isLarge ? 'text-lg' : 'text-base'}`}>
            {section.title}
          </h3>
        </div>
      </div>

      {/* Items */}
      <div className={isLarge ? 'p-5' : 'p-4'}>
        <ul className="space-y-3">
          {section.items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2
                className="flex-shrink-0 text-green-500 mt-0.5"
                size={isLarge ? 20 : 18}
              />
              <span className={`text-green-900 ${isLarge ? 'text-lg' : 'text-base'}`}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className={`border-t border-green-200 ${isLarge ? 'px-5 py-3' : 'px-4 py-2'}`}>
        <p className="text-sm text-green-700">
          {section.items.length} learning outcome{section.items.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
