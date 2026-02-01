'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type {
  CourseStructure,
  NavigationLesson,
  BreadcrumbItem,
} from '@/lib/types/navigation';
import {
  findLessonById,
  getAdjacentLessons,
  buildBreadcrumbs,
} from '@/lib/types/navigation';

// =============================================================================
// Types
// =============================================================================

interface NavigationContextValue {
  // Course structure
  structure: CourseStructure | null;
  isLoading: boolean;
  error: string | null;

  // Current position
  currentLesson: NavigationLesson | null;
  currentSectionIndex: number;
  setCurrentSectionIndex: (index: number) => void;

  // Navigation helpers
  nextLesson: NavigationLesson | null;
  previousLesson: NavigationLesson | null;
  goToNextLesson: () => void;
  goToPreviousLesson: () => void;

  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;

  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];

  // Section name (for teaching mode breadcrumbs)
  currentSectionName: string | null;
  setCurrentSectionName: (name: string | null) => void;
}

interface NavigationProviderProps {
  children: ReactNode;
  courseSlug: string;
  initialStructure?: CourseStructure;
}

// =============================================================================
// Constants
// =============================================================================

const SIDEBAR_OPEN_KEY = 'bamboo-sidebar-open';
const SIDEBAR_COLLAPSED_KEY = 'bamboo-sidebar-collapsed';

// =============================================================================
// Context
// =============================================================================

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

export function NavigationProvider({
  children,
  courseSlug,
  initialStructure,
}: NavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Structure state
  const [structure, setStructure] = useState<CourseStructure | null>(initialStructure || null);
  const [isLoading, setIsLoading] = useState(!initialStructure);
  const [error, setError] = useState<string | null>(null);

  // Section state
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentSectionName, setCurrentSectionName] = useState<string | null>(null);

  // Sidebar state (initialized as null, will be hydrated from localStorage)
  const [sidebarOpen, setSidebarOpenState] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean | null>(null);

  // Hydrate sidebar state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedOpen = localStorage.getItem(SIDEBAR_OPEN_KEY);
      const storedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);

      setSidebarOpenState(storedOpen !== null ? JSON.parse(storedOpen) : true);
      setSidebarCollapsedState(storedCollapsed !== null ? JSON.parse(storedCollapsed) : false);
    } catch {
      setSidebarOpenState(true);
      setSidebarCollapsedState(false);
    }
  }, []);

  // Persist sidebar state to localStorage
  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SIDEBAR_OPEN_KEY, JSON.stringify(open));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!(sidebarOpen ?? true));
  }, [sidebarOpen, setSidebarOpen]);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(!(sidebarCollapsed ?? false));
  }, [sidebarCollapsed, setSidebarCollapsed]);

  // Fetch structure if not provided initially
  useEffect(() => {
    if (initialStructure) return;

    async function fetchStructure() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/courses/${courseSlug}/navigation`);
        if (!response.ok) {
          throw new Error('Failed to fetch course structure');
        }

        const data = await response.json();
        setStructure(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStructure();
  }, [courseSlug, initialStructure]);

  // Extract current lesson ID from pathname
  const currentLessonId = useMemo(() => {
    // Match patterns like /courses/[slug]/lessons/[lessonId] or /lessons/[lessonId]
    const lessonMatch = pathname.match(/\/lessons\/([^/]+)/);
    return lessonMatch ? lessonMatch[1] : null;
  }, [pathname]);

  // Find current lesson in structure
  const currentLesson = useMemo(() => {
    if (!structure || !currentLessonId) return null;
    return findLessonById(structure, currentLessonId);
  }, [structure, currentLessonId]);

  // Get adjacent lessons
  const { next: nextLesson, previous: previousLesson } = useMemo(() => {
    if (!structure || !currentLessonId) {
      return { next: null, previous: null };
    }
    return getAdjacentLessons(structure, currentLessonId);
  }, [structure, currentLessonId]);

  // Navigation functions
  const goToNextLesson = useCallback(() => {
    if (nextLesson) {
      router.push(nextLesson.url);
    }
  }, [nextLesson, router]);

  const goToPreviousLesson = useCallback(() => {
    if (previousLesson) {
      router.push(previousLesson.url);
    }
  }, [previousLesson, router]);

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!structure || !currentLessonId) {
      return [{ label: structure?.courseTitle || 'Course', href: `/courses/${courseSlug}` }];
    }
    return buildBreadcrumbs(structure, currentLessonId, currentSectionName || undefined);
  }, [structure, currentLessonId, courseSlug, currentSectionName]);

  // Reset section index when lesson changes
  useEffect(() => {
    setCurrentSectionIndex(0);
    setCurrentSectionName(null);
  }, [currentLessonId]);

  // Context value
  const value: NavigationContextValue = useMemo(
    () => ({
      structure,
      isLoading,
      error,
      currentLesson,
      currentSectionIndex,
      setCurrentSectionIndex,
      nextLesson,
      previousLesson,
      goToNextLesson,
      goToPreviousLesson,
      sidebarOpen: sidebarOpen ?? true,
      sidebarCollapsed: sidebarCollapsed ?? false,
      setSidebarOpen,
      setSidebarCollapsed,
      toggleSidebar,
      toggleSidebarCollapse,
      breadcrumbs,
      currentSectionName,
      setCurrentSectionName,
    }),
    [
      structure,
      isLoading,
      error,
      currentLesson,
      currentSectionIndex,
      nextLesson,
      previousLesson,
      goToNextLesson,
      goToPreviousLesson,
      sidebarOpen,
      sidebarCollapsed,
      setSidebarOpen,
      setSidebarCollapsed,
      toggleSidebar,
      toggleSidebarCollapse,
      breadcrumbs,
      currentSectionName,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if not in a NavigationProvider
 * Useful for components that may be used outside the navigation context
 */
export function useNavigationOptional(): NavigationContextValue | null {
  return useContext(NavigationContext) ?? null;
}
