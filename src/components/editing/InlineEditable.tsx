'use client';

import { useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { cn } from '@/lib/utils';

interface InlineEditableProps {
  /** The section ID this editable field belongs to */
  sectionId: string;
  /** The field name in the section data (e.g. 'text', 'content', 'instruction') */
  field: string;
  /** The element tag to render (defaults to 'span') */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  /** Additional CSS classes */
  className?: string;
  /** Whether this is a multiline field (allows Enter for newlines) */
  multiline?: boolean;
  /** The children to display (normal text content) */
  children: ReactNode;
}

/**
 * Wraps text content to make it inline-editable in edit mode.
 *
 * When edit mode is OFF: renders children normally, zero visual change.
 * When edit mode is ON: adds a blue dashed outline and makes the
 * content editable via native contentEditable. Changes are tracked
 * in EditModeContext and saved when the user clicks Save.
 */
export function InlineEditable({
  sectionId,
  field,
  as: Tag = 'span',
  className,
  multiline = false,
  children,
}: InlineEditableProps) {
  const { isEditing, updateField } = useEditMode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const lastSavedValue = useRef<string | null>(null);

  const handleBlur = useCallback(() => {
    if (!ref.current) return;
    const newValue = ref.current.innerText.trim();

    // Only record change if value actually changed
    if (lastSavedValue.current !== null && newValue === lastSavedValue.current) {
      return;
    }

    lastSavedValue.current = newValue;
    updateField(sectionId, field, newValue);
  }, [sectionId, field, updateField]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Enter: submit for single-line, newline for multiline
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        ref.current?.blur();
      }
      // Escape: cancel edit, restore original
      if (e.key === 'Escape') {
        e.preventDefault();
        ref.current?.blur();
      }
    },
    [multiline],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Strip formatting, paste plain text only
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleFocus = useCallback(() => {
    // Save the initial value when the user starts editing
    if (ref.current && lastSavedValue.current === null) {
      lastSavedValue.current = ref.current.innerText.trim();
    }
  }, []);

  if (!isEditing) {
    // Read-only mode — render normally with zero overhead
    return <Tag className={className}>{children}</Tag>;
  }

  // Edit mode — add contentEditable with visual indicators
  return (
    <Tag
      ref={ref}
      className={cn(
        className,
        // Edit mode styling
        'outline-2 outline-dashed outline-blue-400/50',
        'hover:outline-blue-500/70 focus:outline-blue-500',
        'focus:bg-blue-50/30 rounded px-0.5 -mx-0.5',
        'transition-all cursor-text',
      )}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      role="textbox"
      aria-label={`Edit ${field}`}
    >
      {children}
    </Tag>
  );
}
