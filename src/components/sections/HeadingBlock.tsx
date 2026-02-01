'use client';

import { createElement } from 'react';
import type { HeadingSection } from '@/lib/types/content';

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
      ? 'text-3xl lg:text-4xl font-bold text-gray-900 mb-6'
      : 'text-2xl lg:text-3xl font-bold text-gray-900 mb-4',
    2: isLarge
      ? 'text-2xl lg:text-3xl font-semibold text-gray-900 mb-4'
      : 'text-xl lg:text-2xl font-semibold text-gray-900 mb-3',
    3: isLarge
      ? 'text-xl lg:text-2xl font-semibold text-gray-800 mb-3'
      : 'text-lg lg:text-xl font-semibold text-gray-800 mb-2',
  };

  const tag = `h${section.level}` as 'h1' | 'h2' | 'h3';

  return createElement(
    tag,
    {
      id: anchorId,
      className: `${headingClasses[section.level]} scroll-mt-24`,
    },
    section.text
  );
}
