/**
 * Course Structure Fetcher
 *
 * Fetches and transforms course navigation data from Notion
 * into the CourseStructure format used by the navigation system.
 */

import { unstable_cache } from 'next/cache';
import { getCourseStructure } from '@/lib/notion';
import { getCourseBySlug } from '@/lib/courses';
import type { CourseStructure, NavigationModule, NavigationLesson } from '@/lib/types/navigation';
import type { Module, Lesson, Course } from '@/lib/types';

/**
 * Transform a Lesson to NavigationLesson
 */
function transformLesson(
  lesson: Lesson,
  moduleName: string | null,
  courseSlug: string
): NavigationLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    module: moduleName,
    unit: null, // Can be extended to extract from Notion properties
    order: lesson.order,
    status: 'ready',
    url: `/courses/${courseSlug}/lessons/${lesson.id}`,
    icon: lesson.icon,
  };
}

/**
 * Transform Module[] to NavigationModule[]
 */
function transformModules(
  modules: Module[],
  courseSlug: string
): NavigationModule[] {
  return modules.map((module) => ({
    id: module.id,
    name: module.title,
    icon: module.icon,
    units: [], // Units can be populated from Notion properties in the future
    standaloneLessons: module.lessons
      .map((lesson) => transformLesson(lesson, module.title, courseSlug))
      .sort((a, b) => a.order - b.order),
  }));
}

/**
 * Count total lessons in a course structure
 */
function countLessons(modules: NavigationModule[], standaloneLessons: NavigationLesson[]): number {
  let count = standaloneLessons.length;

  for (const module of modules) {
    count += module.standaloneLessons.length;
    for (const unit of module.units) {
      count += unit.lessons.length;
    }
  }

  return count;
}

/**
 * Fetch course navigation structure from Notion
 *
 * This wraps the existing getCourseStructure function and transforms
 * the result into the CourseStructure format used by the navigation system.
 */
async function fetchCourseNavigationInternal(courseSlug: string): Promise<CourseStructure> {
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    throw new Error(`Course not found: ${courseSlug}`);
  }

  if (!course.enabled) {
    throw new Error(`Course is disabled: ${courseSlug}`);
  }

  // Fetch from Notion using existing function
  const courseData = await getCourseStructure(course);

  // Transform to navigation structure
  const modules = transformModules(courseData.modules, courseSlug);

  // Handle resources and handbooks as standalone lessons
  const standaloneLessons: NavigationLesson[] = [
    ...courseData.resources.map((resource, index) => ({
      id: resource.id,
      title: resource.title,
      module: null,
      unit: null,
      order: 1000 + index, // High order number to sort after modules
      status: 'ready' as const,
      url: resource.url,
      icon: resource.icon,
    })),
    ...courseData.handbooks.map((handbook, index) => ({
      id: handbook.id,
      title: handbook.title,
      module: null,
      unit: null,
      order: 2000 + index, // Even higher order number
      status: 'ready' as const,
      url: handbook.url,
      icon: handbook.icon,
    })),
  ];

  const structure: CourseStructure = {
    courseId: course.id,
    courseSlug: course.slug,
    courseTitle: course.title,
    modules,
    standaloneLessons,
    totalLessons: countLessons(modules, standaloneLessons),
  };

  return structure;
}

/**
 * Cached version of fetchCourseNavigation
 *
 * Caches results for 5 minutes (300 seconds) for performance.
 */
export const fetchCourseNavigation = unstable_cache(
  fetchCourseNavigationInternal,
  ['course-navigation'],
  {
    revalidate: 300,
    tags: ['course-navigation'],
  }
);

/**
 * Fetch course navigation without caching (for testing)
 */
export { fetchCourseNavigationInternal as fetchCourseNavigationUncached };

/**
 * Get a specific course's configuration
 */
export function getCourse(courseSlug: string): Course | undefined {
  return getCourseBySlug(courseSlug);
}
