'use client';

import type { HeadingSection } from '@/lib/types/content';
import { InlineEditable } from '@/components/editing/InlineEditable';

interface HeadingBlockProps {
  section: HeadingSection;
  variant?: 'compact' | 'large';
}

export function HeadingBlock({ section, variant = 'compact' }: HeadingBlockProps) {
  const isLarge = variant === 'large';

  // Generate anchor ID from text
  const anchorId = section.text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const headingClasses = {
    1: isLarge
      ? 'text-3xl lg:text-4xl font-bold text-text-primary mb-6'
      : 'text-2xl lg:text-3xl font-bold text-text-primary mb-4',
    2: isLarge
      ? 'text-2xl lg:text-3xl font-semibold text-text-primary mb-4'
      : 'text-xl lg:text-2xl font-semibold text-text-primary mb-3',
    3: isLarge
      ? 'text-xl lg:text-2xl font-semibold text-text-primary mb-3'
      : 'text-lg lg:text-xl font-semibold text-text-primary mb-2',
  };

  const tag = `h${section.level}` as 'h1' | 'h2' | 'h3';

  return (
    <InlineEditable
      sectionId={section.id}
      field="text"
      as={tag}
      className={`${headingClasses[section.level]} scroll-mt-24`}
    >
      {section.text}
    </InlineEditable>
  );
}
