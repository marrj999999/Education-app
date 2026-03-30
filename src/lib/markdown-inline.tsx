import React from 'react';

/**
 * Parse inline markdown markers and return React elements.
 * Handles: **bold**, *italic*, `code`, and combinations.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;

  // Split by markdown patterns and rebuild as React elements
  const parts: React.ReactNode[] = [];

  // Process the text character by character using regex
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let key = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={key++} className="font-semibold text-text-primary">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(<code key={key++} className="px-1.5 py-0.5 bg-surface-hover text-sm rounded font-mono">{match[4]}</code>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
