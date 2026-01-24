'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { ProgressContextType } from '@/lib/types';

const STORAGE_KEY = 'bamboo-course-progress';

// Debounce helper
function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

interface ProgressProviderProps {
  children: ReactNode;
  courseSlug?: string; // Optional course context for backend sync
}

interface SyncedProgress {
  lessonId: string;
  courseSlug: string;
  completedAt: string;
  notes?: string;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children, courseSlug }: ProgressProviderProps) {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [totalLessons, setTotalLessons] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const courseSlugRef = useRef(courseSlug);

  // Keep ref updated
  useEffect(() => {
    courseSlugRef.current = courseSlug;
  }, [courseSlug]);

  // Load progress from localStorage immediately, then sync with backend
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load from localStorage first (offline support)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.completedLessons)) {
          setCompletedLessons(parsed.completedLessons);
        }
      }
    } catch (e) {
      console.error('Failed to load progress from localStorage:', e);
    }

    setIsLoaded(true);

    // Defer backend sync to not block initial render
    // Uses requestIdleCallback when available for better performance
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        () => syncFromBackend(),
        { timeout: 2000 }
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => syncFromBackend(), 100);
    }
  }, []);

  // Sync progress from backend
  const syncFromBackend = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);

      const url = courseSlugRef.current
        ? `/api/progress?courseSlug=${encodeURIComponent(courseSlugRef.current)}`
        : '/api/progress';

      const response = await fetch(url);

      // Handle redirects (middleware redirects to login when not authenticated)
      if (response.redirected || response.status === 307 || response.status === 302) {
        // User not logged in - middleware redirected to login page
        setIsSyncing(false);
        return;
      }

      if (response.status === 401) {
        // User not logged in - use localStorage only
        setIsSyncing(false);
        return;
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Response is not JSON (likely HTML from redirect)
        setIsSyncing(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      const backendLessons = (data.completedLessons as SyncedProgress[]).map(
        (p) => p.lessonId
      );

      // Merge with localStorage (backend is source of truth)
      setCompletedLessons(backendLessons);

      // Update localStorage with backend data
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              completedLessons: backendLessons,
              lastUpdated: new Date().toISOString(),
              syncedAt: new Date().toISOString(),
            })
          );
        } catch (e) {
          // localStorage quota exceeded - continue without caching
          console.warn('localStorage quota exceeded:', e);
        }
      }
    } catch (e) {
      console.error('Failed to sync progress from backend:', e);
      setSyncError('Failed to sync progress');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Save progress to localStorage whenever it changes (debounced)
  const saveToLocalStorage = useCallback(
    debounce((lessons: string[]) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            completedLessons: lessons,
            lastUpdated: new Date().toISOString(),
          })
        );
      } catch (e) {
        // localStorage quota exceeded
        console.warn('Failed to save to localStorage:', e);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (isLoaded) {
      saveToLocalStorage(completedLessons);
    }
  }, [completedLessons, isLoaded, saveToLocalStorage]);

  const isComplete = useCallback(
    (lessonId: string): boolean => {
      return completedLessons.includes(lessonId);
    },
    [completedLessons]
  );

  const markComplete = useCallback(
    async (lessonId: string): Promise<void> => {
      // Optimistic update
      setCompletedLessons((prev) => {
        if (prev.includes(lessonId)) return prev;
        return [...prev, lessonId];
      });

      // Sync to backend if we have a course context
      if (courseSlugRef.current) {
        try {
          const response = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lessonId,
              courseSlug: courseSlugRef.current,
            }),
          });

          if (!response.ok && response.status !== 401) {
            throw new Error('Failed to sync');
          }
        } catch (e) {
          console.error('Failed to sync progress to backend:', e);
          // Keep optimistic update - will sync later
        }
      }
    },
    []
  );

  const markIncomplete = useCallback(async (lessonId: string): Promise<void> => {
    // Optimistic update
    setCompletedLessons((prev) => prev.filter((id) => id !== lessonId));

    // Sync to backend
    try {
      const response = await fetch('/api/progress', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });

      if (!response.ok && response.status !== 401) {
        throw new Error('Failed to sync');
      }
    } catch (e) {
      console.error('Failed to remove progress from backend:', e);
      // Keep optimistic update
    }
  }, []);

  const toggleComplete = useCallback(
    async (lessonId: string): Promise<void> => {
      if (completedLessons.includes(lessonId)) {
        await markIncomplete(lessonId);
      } else {
        await markComplete(lessonId);
      }
    },
    [completedLessons, markComplete, markIncomplete]
  );

  const getProgress = useCallback(() => {
    const completed = completedLessons.length;
    const total = totalLessons || completed; // Avoid division by zero
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [completedLessons, totalLessons]);

  const value: ProgressContextType = {
    completedLessons,
    isComplete,
    markComplete,
    markIncomplete,
    toggleComplete,
    getProgress,
    totalLessons,
    setTotalLessons,
    isSyncing,
    syncError,
    refresh: syncFromBackend,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextType {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
