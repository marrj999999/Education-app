'use client';

import type { ProseSection } from '@/lib/types/content';

interface ProseBlockProps {
  section: ProseSection;
  variant?: 'compact' | 'large';
}

export function ProseBlock({ section, variant = 'compact' }: ProseBlockProps) {
  const isLarge = variant === 'large';

  // If HTML content is provided, render it (content is from trusted CMS source only)
  if (section.htmlContent) {
    return (
      <div
        className={`
          prose prose-gray max-w-none
          ${isLarge ? 'prose-lg' : ''}
        `}
        dangerouslySetInnerHTML={{ __html: section.htmlContent }}
      />
    );
  }

  // Pre-process: split pipe-concatenated bullets into separate lines
  let content = section.content;
  if (content.includes(' | • ')) {
    content = content.replace(/ \| • /g, '\n• ');
  }
  if (content.includes(' | ☐ ') || content.includes(' | ☑ ')) {
    content = content.replace(/ \| (☐|☑) /g, '\n$1 ');
  }

  const lines = content.split('\n').filter(Boolean);

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className={`border-l-4 border-border pl-4 italic text-text-secondary ${isLarge ? 'text-lg' : 'text-base'}`}
            >
              {trimmed.substring(2)}
            </blockquote>
          );
        }

        // Bullet point
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="text-text-tertiary mt-1 flex-shrink-0">•</span>
              <span className={`text-text-secondary ${isLarge ? 'text-lg' : 'text-base'}`}>
                {trimmed.substring(2)}
              </span>
            </div>
          );
        }

        // Checkbox item
        if (trimmed.startsWith('☐ ') || trimmed.startsWith('☑ ')) {
          const isChecked = trimmed.startsWith('☑');
          return (
            <div key={index} className="flex items-start gap-2">
              <span className={`mt-1 flex-shrink-0 ${isChecked ? 'text-teal' : 'text-text-tertiary'}`}>
                {isChecked ? '☑' : '☐'}
              </span>
              <span className={`${isLarge ? 'text-lg' : 'text-base'} ${isChecked ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>
                {trimmed.substring(2)}
              </span>
            </div>
          );
        }

        // Code block start
        if (trimmed.startsWith('```')) {
          return null; // Code blocks handled elsewhere
        }

        // Regular paragraph
        return (
          <p
            key={index}
            className={`text-text-secondary leading-relaxed ${isLarge ? 'text-lg lg:text-xl' : 'text-base'}`}
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
