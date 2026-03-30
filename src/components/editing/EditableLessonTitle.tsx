'use client';

import { useRef, useCallback } from 'react';
import { useGlobalEditMode } from '@/context/GlobalEditModeContext';
import { cn } from '@/lib/utils';

interface EditableLessonTitleProps {
  lessonId: string;
  title: string;
  className?: string;
}

/**
 * Inline-editable lesson title.
 * When global edit mode is ON, the h1 becomes contentEditable.
 * On blur, saves the new title via the lesson sections API.
 */
export function EditableLessonTitle({
  lessonId,
  title,
  className,
}: EditableLessonTitleProps) {
  const { isEditModeEnabled } = useGlobalEditMode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const originalTitle = useRef(title);

  const handleBlur = useCallback(async () => {
    if (!ref.current) return;
    const newTitle = ref.current.innerText.trim();
    if (newTitle === originalTitle.current || !newTitle) return;

    try {
      const response = await fetch(`/api/lessons/${lessonId}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: { _lesson: { title: newTitle } },
        }),
      });

      if (response.ok) {
        originalTitle.current = newTitle;
      } else {
        // Revert on failure
        ref.current.innerText = originalTitle.current;
      }
    } catch {
      ref.current.innerText = originalTitle.current;
    }
  }, [lessonId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ref.current) {
        ref.current.innerText = originalTitle.current;
      }
      ref.current?.blur();
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  if (!isEditModeEnabled) {
    return <h1 className={className}>{title}</h1>;
  }

  return (
    <h1
      ref={ref}
      className={cn(
        className,
        'outline-2 outline-dashed outline-blue-400/50',
        'hover:outline-blue-500/70 focus:outline-blue-500',
        'focus:bg-teal/10 rounded px-0.5 -mx-0.5',
        'transition-all cursor-text',
      )}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      role="textbox"
      aria-label="Edit lesson title"
    >
      {title}
    </h1>
  );
}
