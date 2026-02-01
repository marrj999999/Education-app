'use client';

import type { ProseSection } from '@/lib/types/content';

interface ProseBlockProps {
  section: ProseSection;
  variant?: 'compact' | 'large';
}

export function ProseBlock({ section, variant = 'compact' }: ProseBlockProps) {
  const isLarge = variant === 'large';

  // If HTML content is provided, render it
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

  // Render plain text content with paragraph breaks
  const paragraphs = section.content.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => {
        // Check for special formatting
        const isBlockquote = paragraph.startsWith('> ');
        const isBullet = paragraph.startsWith('• ');
        const isCodeBlock = paragraph.startsWith('```');
        const isCheckbox = paragraph.startsWith('☐ ') || paragraph.startsWith('☑ ');

        // Blockquote
        if (isBlockquote) {
          return (
            <blockquote
              key={index}
              className={`
                border-l-4 border-gray-300 pl-4 italic text-gray-600
                ${isLarge ? 'text-lg' : 'text-base'}
              `}
            >
              {paragraph.substring(2)}
            </blockquote>
          );
        }

        // Bullet point
        if (isBullet) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span className={`text-gray-700 ${isLarge ? 'text-lg' : 'text-base'}`}>
                {paragraph.substring(2)}
              </span>
            </div>
          );
        }

        // Code block
        if (isCodeBlock) {
          const lines = paragraph.split('\n');
          const language = lines[0].substring(3);
          const code = lines.slice(1, -1).join('\n');

          return (
            <pre
              key={index}
              className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto"
            >
              {language && (
                <div className="text-xs text-gray-500 mb-2">{language}</div>
              )}
              <code className={isLarge ? 'text-base' : 'text-sm'}>{code}</code>
            </pre>
          );
        }

        // Checkbox item
        if (isCheckbox) {
          const isChecked = paragraph.startsWith('☑');
          return (
            <div key={index} className="flex items-start gap-2">
              <span className={`mt-1 ${isChecked ? 'text-green-500' : 'text-gray-400'}`}>
                {isChecked ? '☑' : '☐'}
              </span>
              <span
                className={`
                  ${isLarge ? 'text-lg' : 'text-base'}
                  ${isChecked ? 'text-gray-500 line-through' : 'text-gray-700'}
                `}
              >
                {paragraph.substring(2)}
              </span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p
            key={index}
            className={`
              text-gray-700 leading-relaxed
              ${isLarge ? 'text-lg lg:text-xl' : 'text-base'}
            `}
          >
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
