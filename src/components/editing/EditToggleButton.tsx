'use client';

import { Pencil } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { useGlobalEditMode } from '@/context/GlobalEditModeContext';
import { cn } from '@/lib/utils';

/**
 * Standalone edit mode toggle button.
 * Use this on pages that don't have TopNav (e.g. standalone lesson pages).
 * Reads session for role check and global edit mode for toggle state.
 * Only visible to ADMIN and SUPER_ADMIN users.
 */
export function EditToggleButton() {
  const { data: session } = useSession();
  const { isEditModeEnabled, toggleEditMode } = useGlobalEditMode();

  // Only show for ADMIN and SUPER_ADMIN
  const role = session?.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <button
      onClick={toggleEditMode}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
        isEditModeEnabled
          ? 'bg-blue-500 text-white shadow-sm ring-2 ring-blue-300'
          : 'text-text-secondary bg-surface border border-border hover:bg-surface-hover',
      )}
      aria-label={isEditModeEnabled ? 'Exit edit mode' : 'Enter edit mode'}
      aria-pressed={isEditModeEnabled}
      title={isEditModeEnabled ? 'Edit Mode ON' : 'Edit Mode'}
    >
      <Pencil size={14} />
      {isEditModeEnabled ? 'Editing' : 'Edit'}
    </button>
  );
}
