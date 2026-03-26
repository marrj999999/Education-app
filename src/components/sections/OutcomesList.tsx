'use client';

import { Target, CheckCircle2 } from 'lucide-react';
import type { OutcomesSection } from '@/lib/types/content';
import { InlineEditable } from '@/components/editing/InlineEditable';

interface OutcomesListProps {
  section: OutcomesSection;
  variant?: 'compact' | 'large';
}

export function OutcomesList({ section, variant = 'compact' }: OutcomesListProps) {
  const isLarge = variant === 'large';

  return (
    <div className="bg-success-light border border-success-medium rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`border-b border-success-medium ${isLarge ? 'p-5' : 'p-4'}`}>
        <div className="flex items-center gap-3">
          <Target className="text-success" size={isLarge ? 24 : 20} />
          <InlineEditable
            sectionId={section.id}
            field="title"
            as="h3"
            className={`font-semibold text-success-darker ${isLarge ? 'text-lg' : 'text-base'}`}
          >
            {section.title}
          </InlineEditable>
        </div>
      </div>

      {/* Items */}
      <div className={isLarge ? 'p-5' : 'p-4'}>
        <ul className="space-y-3">
          {section.items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2
                className="flex-shrink-0 text-success mt-0.5"
                size={isLarge ? 20 : 18}
              />
              <InlineEditable
                sectionId={section.id}
                field={`items[${index}]`}
                as="span"
                className={`text-success-darker ${isLarge ? 'text-lg' : 'text-base'}`}
              >
                {item}
              </InlineEditable>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className={`border-t border-success-medium ${isLarge ? 'px-5 py-3' : 'px-4 py-2'}`}>
        <p className="text-sm text-success-dark">
          {section.items.length} learning outcome{section.items.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
