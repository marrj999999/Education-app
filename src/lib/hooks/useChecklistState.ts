'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

interface UseChecklistStateOptions {
  /** Unique identifier for this checklist (used for localStorage key) */
  lessonId: string;
  /** All valid item IDs in this checklist */
  allItemIds: string[];
  /** Debounce delay in milliseconds for localStorage writes */
  debounceMs?: number;
}

interface UseChecklistStateReturn {
  /** Check if a specific item is checked */
  isChecked: (itemId: string) => boolean;
  /** Toggle a specific item */
  toggle: (itemId: string) => void;
  /** Check a specific item */
  check: (itemId: string) => void;
  /** Uncheck a specific item */
  uncheck: (itemId: string) => void;
  /** Check all items in the provided list */
  checkAll: (itemIds: string[]) => void;
  /** Uncheck all items in the provided list */
  uncheckAll: (itemIds: string[]) => void;
  /** Number of checked items */
  checkedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Array of checked item IDs */
  checkedItems: string[];
  /** Reset all items to unchecked */
  reset: () => void;
  /** Percentage of items checked (0-100) */
  percentage: number;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_PREFIX = 'checklist-';
const DEFAULT_DEBOUNCE_MS = 500;

// =============================================================================
// Helpers
// =============================================================================

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

// =============================================================================
// Hook
// =============================================================================

export function useChecklistState({
  lessonId,
  allItemIds,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseChecklistStateOptions): UseChecklistStateReturn {
  const [checkedSet, setCheckedSet] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const storageKey = `${STORAGE_PREFIX}${lessonId}`;

  // Memoize allItemIds as a Set for efficient lookup
  const validItemIds = useMemo(() => new Set(allItemIds), [allItemIds]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out stale items that are no longer in allItemIds
          const validItems = parsed.filter((id: string) => validItemIds.has(id));
          setCheckedSet(new Set(validItems));
        }
      }
    } catch {
      // Ignore parse errors
    }

    setIsHydrated(true);
  }, [storageKey, validItemIds]);

  // Create debounced save function
  const saveToStorage = useRef(
    debounce((items: string[]) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }, debounceMs)
  ).current;

  // Save to localStorage when checked items change (debounced)
  useEffect(() => {
    if (!isHydrated) return;
    saveToStorage([...checkedSet]);
  }, [checkedSet, isHydrated, saveToStorage]);

  // Check if an item is checked
  const isChecked = useCallback(
    (itemId: string): boolean => {
      return checkedSet.has(itemId);
    },
    [checkedSet]
  );

  // Toggle an item
  const toggle = useCallback((itemId: string) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Check an item
  const check = useCallback((itemId: string) => {
    setCheckedSet((prev) => {
      if (prev.has(itemId)) return prev;
      return new Set([...prev, itemId]);
    });
  }, []);

  // Uncheck an item
  const uncheck = useCallback((itemId: string) => {
    setCheckedSet((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  // Check all items in the provided list
  const checkAll = useCallback((itemIds: string[]) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      for (const id of itemIds) {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Uncheck all items in the provided list
  const uncheckAll = useCallback((itemIds: string[]) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      for (const id of itemIds) {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Reset all items
  const reset = useCallback(() => {
    setCheckedSet(new Set());
  }, []);

  // Compute derived values
  const checkedItems = useMemo(() => [...checkedSet], [checkedSet]);
  const checkedCount = checkedSet.size;
  const totalCount = allItemIds.length;
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return {
    isChecked,
    toggle,
    check,
    uncheck,
    checkAll,
    uncheckAll,
    checkedCount,
    totalCount,
    checkedItems,
    reset,
    percentage,
  };
}
