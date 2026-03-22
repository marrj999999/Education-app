'use client';

import { BookOpen } from 'lucide-react';
import type { VocabularySection } from '@/lib/types/content';

interface VocabularyCardsProps {
  section: VocabularySection;
  variant?: 'compact' | 'large';
}

export function VocabularyCards({ section, variant = 'compact' }: VocabularyCardsProps) {
  const isLarge = variant === 'large';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <BookOpen size={isLarge ? 24 : 20} />
        <h3 className={`font-semibold ${isLarge ? 'text-lg' : 'text-base'}`}>
          Key Terms ({section.terms.length})
        </h3>
      </div>

      {/* Term Cards */}
      <div className={`grid gap-3 ${isLarge ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {section.terms.map((item, index) => (
          <div
            key={index}
            className={`
              bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden
              hover:border-[var(--border)] hover:shadow-sm transition-all
            `}
          >
            {/* Term */}
            <div
              className={`
                bg-[var(--surface-hover)] border-b border-[var(--border)]
                ${isLarge ? 'px-4 py-3' : 'px-3 py-2'}
              `}
            >
              <dt className={`font-semibold text-[var(--text-primary)] ${isLarge ? 'text-lg' : 'text-base'}`}>
                {item.term}
              </dt>
            </div>

            {/* Definition */}
            <div className={isLarge ? 'px-4 py-3' : 'px-3 py-2'}>
              <dd className={`text-[var(--text-secondary)] ${isLarge ? 'text-base' : 'text-sm'}`}>
                {item.definition}
              </dd>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
