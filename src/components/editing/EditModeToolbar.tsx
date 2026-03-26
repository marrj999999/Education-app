'use client';

import { Save, X, Loader2, AlertCircle } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { cn } from '@/lib/utils';

/**
 * Floating toolbar for edit mode controls.
 *
 * Only shows when edit mode is active (global toggle in TopNav).
 * Displays Save / Cancel buttons + dirty indicator.
 * The edit mode toggle itself is in TopNav, not here.
 */
export function EditModeToolbar() {
  const { isEditing, isDirty, isSaving, saveError, save, cancel } =
    useEditMode();

  // Only show when edit mode is active
  if (!isEditing) {
    return null;
  }

  // Edit mode active — show the floating toolbar
  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-5 py-3',
        'bg-surface border-2 border-blue-400 rounded-xl shadow-xl',
        'backdrop-blur-sm',
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isDirty ? 'bg-warning animate-pulse' : 'bg-success',
          )}
        />
        <span className="text-sm text-text-secondary">
          {isSaving
            ? 'Saving...'
            : isDirty
              ? 'Unsaved changes'
              : 'Edit mode'}
        </span>
      </div>

      {/* Error message */}
      {saveError && (
        <div className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle size={14} />
          <span className="max-w-[200px] truncate">{saveError}</span>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={save}
        disabled={!isDirty || isSaving}
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-2',
          'text-sm font-medium rounded-lg transition-colors',
          isDirty && !isSaving
            ? 'bg-teal text-white hover:bg-forest shadow-sm'
            : 'bg-surface-hover text-text-tertiary cursor-not-allowed',
        )}
      >
        {isSaving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Save size={14} />
        )}
        Save
      </button>

      {/* Cancel button */}
      <button
        onClick={cancel}
        disabled={isSaving}
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-2',
          'text-sm font-medium text-text-secondary rounded-lg',
          'hover:bg-surface-hover transition-colors',
          isSaving && 'opacity-50 cursor-not-allowed',
        )}
      >
        <X size={14} />
        Cancel
      </button>
    </div>
  );
}
