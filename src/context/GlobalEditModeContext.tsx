'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'bamboo-edit-mode';

interface GlobalEditModeContextValue {
  /** Whether edit mode is globally enabled (SUPER_ADMIN toggled it on) */
  isEditModeEnabled: boolean;
  /** Toggle edit mode on/off */
  toggleEditMode: () => void;
}

const GlobalEditModeContext = createContext<GlobalEditModeContextValue>({
  isEditModeEnabled: false,
  toggleEditMode: () => {},
});

/**
 * Global edit mode provider.
 * Wraps the entire app to provide a site-wide edit mode toggle.
 * Only SUPER_ADMIN users can activate it (enforced in the UI, not here).
 * State persists to localStorage so it survives page navigation.
 */
export function GlobalEditModeProvider({ children }: { children: ReactNode }) {
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Don't auto-activate edit mode on page load
  // User must explicitly click the pencil toggle each session
  useEffect(() => {
    setHydrated(true);
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditModeEnabled((prev) => {
      const next = !prev;
      try {
        if (next) {
          localStorage.setItem(STORAGE_KEY, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // localStorage not available
      }
      return next;
    });
  }, []);

  // Don't flash edit mode before hydration
  const value = {
    isEditModeEnabled: hydrated ? isEditModeEnabled : false,
    toggleEditMode,
  };

  return (
    <GlobalEditModeContext.Provider value={value}>
      {children}
    </GlobalEditModeContext.Provider>
  );
}

/**
 * Hook to access the global edit mode state.
 * Returns { isEditModeEnabled, toggleEditMode }.
 */
export function useGlobalEditMode(): GlobalEditModeContextValue {
  return useContext(GlobalEditModeContext);
}
