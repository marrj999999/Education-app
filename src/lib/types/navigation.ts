/**
 * Navigation Types
 *
 * Types for the navigation system including sidebar, breadcrumbs,
 * and course structure hierarchy.
 */

import type { Module, Lesson } from '@/lib/types';

// =============================================================================
// Status Types
// =============================================================================

export type LessonStatus = 'draft' | 'ready';

// =============================================================================
// Navigation Structure Types
// =============================================================================

/**
 * A lesson with navigation metadata
 */
export interface NavigationLesson {
  id: string;
  title: string;
  module: string | null;
  unit: string | null;
  order: number;
  status: LessonStatus;
  url: string;
  icon?: string;
}

/**
 * A unit containing lessons (optional grouping within modules)
 */
export interface NavigationUnit {
  name: string;
  lessons: NavigationLesson[];
}

/**
 * A module containing units and/or standalone lessons
 */
export interface NavigationModule {
  id: string;
  name: string;
  icon?: string;
  units: NavigationUnit[];
  standaloneLessons: NavigationLesson[];
}

/**
 * The complete course navigation structure
 */
export interface CourseStructure {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  modules: NavigationModule[];
  standaloneLessons: NavigationLesson[];
  totalLessons: number;
}

// =============================================================================
// State Types
// =============================================================================

/**
 * Navigation state for the sidebar and current position
 */
export interface NavigationState {
  currentLessonId: string | null;
  currentSectionIndex: number;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

/**
 * A breadcrumb item for navigation path display
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

/**
 * Checklist state keyed by item ID
 */
export interface ChecklistState {
  [itemId: string]: boolean;
}

// =============================================================================
// Adapter Functions
// =============================================================================

/**
 * Convert an existing Lesson to a NavigationLesson
 */
export function adaptLessonToNavigation(
  lesson: Lesson,
  moduleName: string | null,
  courseSlug: string
): NavigationLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    module: moduleName,
    unit: null, // Units are extracted from Notion properties if available
    order: lesson.order,
    status: 'ready', // Default to ready, can be enhanced with Notion status
    url: `/courses/${courseSlug}/lessons/${lesson.id}`,
    icon: lesson.icon,
  };
}

/**
 * Convert existing Module[] to NavigationModule[]
 */
export function adaptModulesToNavigation(
  modules: Module[],
  courseSlug: string
): NavigationModule[] {
  return modules.map((module) => ({
    id: module.id,
    name: module.title,
    icon: module.icon,
    units: [], // Units can be populated from Notion properties
    standaloneLessons: module.lessons.map((lesson) =>
      adaptLessonToNavigation(lesson, module.title, courseSlug)
    ),
  }));
}

/**
 * Get all lessons from a course structure as a flat array
 */
export function flattenLessons(structure: CourseStructure): NavigationLesson[] {
  const lessons: NavigationLesson[] = [];

  // Add standalone lessons at course level
  lessons.push(...structure.standaloneLessons);

  // Add lessons from modules
  for (const mod of structure.modules) {
    // Add standalone lessons in module
    lessons.push(...mod.standaloneLessons);

    // Add lessons from units
    for (const unit of mod.units) {
      lessons.push(...unit.lessons);
    }
  }

  // Sort by order
  return lessons.sort((a, b) => a.order - b.order);
}

/**
 * Find a lesson by ID in the course structure
 */
export function findLessonById(
  structure: CourseStructure,
  lessonId: string
): NavigationLesson | null {
  const allLessons = flattenLessons(structure);
  return allLessons.find((l) => l.id === lessonId) || null;
}

/**
 * Get next and previous lessons relative to current
 */
export function getAdjacentLessons(
  structure: CourseStructure,
  currentLessonId: string
): { next: NavigationLesson | null; previous: NavigationLesson | null } {
  const allLessons = flattenLessons(structure);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);

  if (currentIndex === -1) {
    return { next: null, previous: null };
  }

  return {
    previous: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
    next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
  };
}

/**
 * Build breadcrumb items for a lesson
 */
export function buildBreadcrumbs(
  structure: CourseStructure,
  lessonId: string,
  sectionName?: string
): BreadcrumbItem[] {
  const lesson = findLessonById(structure, lessonId);
  if (!lesson) {
    return [{ label: structure.courseTitle, href: `/courses/${structure.courseSlug}` }];
  }

  const crumbs: BreadcrumbItem[] = [
    { label: structure.courseTitle, href: `/courses/${structure.courseSlug}` },
  ];

  // Add module if present
  if (lesson.module) {
    const foundModule = structure.modules.find((m) => m.name === lesson.module);
    if (foundModule) {
      crumbs.push({
        label: foundModule.name,
        href: `/courses/${structure.courseSlug}#${foundModule.id}`,
      });
    }
  }

  // Add unit if present
  if (lesson.unit) {
    crumbs.push({ label: lesson.unit });
  }

  // Add lesson
  crumbs.push({
    label: lesson.title,
    href: lesson.url,
    isCurrent: !sectionName,
  });

  // Add section if in teaching mode
  if (sectionName) {
    crumbs.push({
      label: sectionName,
      isCurrent: true,
    });
  }

  return crumbs;
}
