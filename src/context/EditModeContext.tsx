'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useGlobalEditMode } from '@/context/GlobalEditModeContext';
import type { ContentSection } from '@/lib/types/content';

// ============================================================================
// Types
// ============================================================================

/** A pending field-level edit: sectionId → { field → newValue } */
type PendingChanges = Map<string, Record<string, unknown>>;

interface EditModeContextValue {
  /** Whether edit mode is currently active (global toggle ON) */
  isEditing: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Current section order (array of section IDs) */
  sectionOrder: string[];
  /** Record a field change for a section */
  updateField: (sectionId: string, field: string, value: unknown) => void;
  /** Record an array item change: e.g. tips[2] or items[0].text */
  updateArrayItem: (
    sectionId: string,
    arrayField: string,
    index: number,
    value: unknown,
    subField?: string,
  ) => void;
  /** Update the section order (from drag-and-drop) */
  reorderSections: (newOrder: string[]) => void;
  /** Save all pending changes to the server */
  save: () => Promise<void>;
  /** Discard all pending changes */
  cancel: () => void;
  /** Error message from last save attempt */
  saveError: string | null;
}

// ============================================================================
// Context
// ============================================================================

const EditModeContext = createContext<EditModeContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface EditModeProviderProps {
  children: ReactNode;
  lessonId: string;
  initialSections: ContentSection[];
}

export function EditModeProvider({
  children,
  lessonId,
  initialSections,
}: EditModeProviderProps) {
  // Read global edit mode state
  const { isEditModeEnabled } = useGlobalEditMode();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track the original section order for reset
  const originalOrder = useRef(initialSections.map((s) => s.id));
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    initialSections.map((s) => s.id),
  );

  // Pending changes: Map<sectionId, { field: value }>
  const pendingChanges = useRef<PendingChanges>(new Map());
  const [isDirty, setIsDirty] = useState(false);

  // When global edit mode is turned OFF, discard unsaved changes
  useEffect(() => {
    if (!isEditModeEnabled && isDirty) {
      pendingChanges.current.clear();
      setSectionOrder([...originalOrder.current]);
      setIsDirty(false);
      setSaveError(null);
    }
  }, [isEditModeEnabled, isDirty]);

  const updateField = useCallback(
    (sectionId: string, field: string, value: unknown) => {
      const existing = pendingChanges.current.get(sectionId) || {};
      pendingChanges.current.set(sectionId, { ...existing, [field]: value });
      setIsDirty(true);
    },
    [],
  );

  /**
   * Update an array item within a section.
   * Examples:
   *   updateArrayItem('s1', 'tips', 2, 'new tip')         → tips[2] = "new tip"
   *   updateArrayItem('s1', 'items', 0, 'new text', 'text') → items[0].text = "new text"
   */
  const updateArrayItem = useCallback(
    (
      sectionId: string,
      arrayField: string,
      index: number,
      value: unknown,
      subField?: string,
    ) => {
      const key = subField
        ? `${arrayField}[${index}].${subField}`
        : `${arrayField}[${index}]`;
      const existing = pendingChanges.current.get(sectionId) || {};
      pendingChanges.current.set(sectionId, { ...existing, [key]: value });
      setIsDirty(true);
    },
    [],
  );

  const reorderSections = useCallback((newOrder: string[]) => {
    setSectionOrder(newOrder);
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Build the changes payload
      const changes: Record<string, Record<string, unknown>> = {};
      pendingChanges.current.forEach((fields, sectionId) => {
        changes[sectionId] = fields;
      });

      const hasFieldChanges = Object.keys(changes).length > 0;
      const hasOrderChanges =
        JSON.stringify(sectionOrder) !==
        JSON.stringify(originalOrder.current);

      if (!hasFieldChanges && !hasOrderChanges) {
        setIsDirty(false);
        return;
      }

      const response = await fetch(`/api/lessons/${lessonId}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          changes: hasFieldChanges ? changes : undefined,
          order: hasOrderChanges ? sectionOrder : undefined,
        }),
      });

      // Check for redirect (session expired → login page)
      if (response.redirected || response.type === 'opaqueredirect') {
        throw new Error('Session expired — please log in again');
      }

      // Check for HTML response (shouldn't happen but defensive)
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        throw new Error('Session expired — please log in again');
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // Log full error details for debugging
        console.error('[EditMode] Save error response:', JSON.stringify(data, null, 2));
        const errorMsg = data.error || `Save failed (${response.status})`;
        const details = data.validationErrors
          ? `\n${JSON.stringify(data.validationErrors)}`
          : '';
        throw new Error(errorMsg + details);
      }

      // Success — clear pending changes and update baseline
      pendingChanges.current.clear();
      originalOrder.current = [...sectionOrder];
      setIsDirty(false);

      // Refresh the page to show updated content from the server
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save changes';
      setSaveError(message);
      console.error('[EditMode] Save failed:', message);
    } finally {
      setIsSaving(false);
    }
  }, [lessonId, sectionOrder]);

  const cancel = useCallback(() => {
    pendingChanges.current.clear();
    setSectionOrder([...originalOrder.current]);
    setIsDirty(false);
    setSaveError(null);
  }, []);

  return (
    <EditModeContext.Provider
      value={{
        isEditing: isEditModeEnabled,
        isDirty,
        isSaving,
        sectionOrder,
        updateField,
        updateArrayItem,
        reorderSections,
        save,
        cancel,
        saveError,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useEditMode(): EditModeContextValue {
  const context = useContext(EditModeContext);
  if (!context) {
    // Return a no-op context for components rendered outside EditModeProvider
    // This allows section components to work both inside and outside edit mode
    return {
      isEditing: false,
      isDirty: false,
      isSaving: false,
      sectionOrder: [],
      updateField: () => {},
      updateArrayItem: () => {},
      reorderSections: () => {},
      save: async () => {},
      cancel: () => {},
      saveError: null,
    };
  }
  return context;
}
