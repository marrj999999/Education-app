import type { Course } from './types';

/**
 * Course Configuration
 *
 * All course content is managed via Payload CMS at /cms.
 * This config defines the static course metadata.
 *
 * Each course needs:
 * - id: Unique identifier
 * - slug: URL-friendly name (used in /courses/[slug])
 * - title: Full course name
 * - shortTitle: Abbreviated name for cards/navigation
 * - description: Course description
 * - icon: Icon name from Icons.tsx
 * - color: Tailwind color theme (green, blue, purple, amber, etc.)
 * - duration: Course duration string
 * - level: OCN level or equivalent
 * - accreditation: Accreditation body (optional)
 * - enabled: Whether the course is active
 */
export const COURSES: Course[] = [
  {
    id: 'workshop-skills',
    slug: 'workshop-skills',
    title: '6 Week Workshop Skills',
    shortTitle: 'Workshop Skills',
    description: 'Master essential bamboo bicycle building techniques through hands-on workshop sessions. Learn frame construction, jointing, and finishing skills.',
    icon: 'wrench',
    color: 'green',
    duration: '6 weeks',
    level: 'Level 1-3',
    accreditation: 'OCN',
    enabled: true,
  },
  {
    id: 'sustainable-manufacturing',
    slug: 'sustainable-manufacturing',
    title: 'Sustainable Manufacturing',
    shortTitle: 'Sustainable Mfg',
    description: 'Learn sustainable manufacturing principles applied to bamboo bicycle production. Covers materials sourcing, eco-friendly processes, and lifecycle assessment.',
    icon: 'bicycle',
    color: 'emerald',
    duration: '8 weeks',
    level: 'Level 2-3',
    accreditation: 'OCN',
    enabled: false, // Enable when CMS content is ready
  },
  {
    id: 'flax-manual-handbook',
    slug: 'flax-manual-handbook',
    title: 'Flax Manual Handbook',
    shortTitle: 'Flax Manual',
    description: 'Complete assembly and build guide for the Flax bamboo bicycle frame kit with detailed illustrations.',
    icon: 'book',
    color: 'teal',
    duration: 'Reference',
    level: 'All Levels',
    accreditation: undefined,
    enabled: true,
    isHandbook: true,
  },
];

/**
 * Get all enabled courses
 */
export function getEnabledCourses(): Course[] {
  return COURSES.filter(course => course.enabled);
}

/**
 * Get all courses (including disabled)
 */
export function getAllCourses(): Course[] {
  return COURSES;
}

/**
 * Get a course by its slug
 */
export function getCourseBySlug(slug: string): Course | undefined {
  return COURSES.find(course => course.slug === slug);
}

/**
 * Get a course by its ID
 */
export function getCourseById(id: string): Course | undefined {
  return COURSES.find(course => course.id === id);
}

/**
 * Get the default course (first enabled course)
 */
export function getDefaultCourse(): Course | undefined {
  return getEnabledCourses()[0];
}

/**
 * Color theme mappings for course cards
 */
export const COURSE_COLOR_THEMES: Record<string, {
  bg: string;
  bgGradient: string;
  text: string;
  border: string;
  accent: string;
  light: string;
}> = {
  green: {
    bg: 'bg-[var(--teal)]',
    bgGradient: 'bg-[var(--forest)]',
    text: 'text-[var(--teal)]',
    border: 'border-[var(--bamboo-200)]',
    accent: 'bg-[var(--gold)]',
    light: 'bg-[var(--bamboo-50)]',
  },
  emerald: {
    bg: 'bg-[var(--teal)]',
    bgGradient: 'bg-[var(--forest)]',
    text: 'text-[var(--teal)]',
    border: 'border-[var(--bamboo-200)]',
    accent: 'bg-[var(--teal)]',
    light: 'bg-[var(--bamboo-50)]',
  },
  blue: {
    bg: 'bg-blue-600',
    bgGradient: 'bg-blue-700',
    text: 'text-blue-600',
    border: 'border-blue-300',
    accent: 'bg-blue-500',
    light: 'bg-blue-100',
  },
  purple: {
    bg: 'bg-purple-600',
    bgGradient: 'bg-purple-700',
    text: 'text-purple-600',
    border: 'border-purple-300',
    accent: 'bg-purple-500',
    light: 'bg-purple-100',
  },
  amber: {
    bg: 'bg-amber-600',
    bgGradient: 'bg-amber-700',
    text: 'text-amber-600',
    border: 'border-amber-300',
    accent: 'bg-amber-500',
    light: 'bg-amber-100',
  },
  teal: {
    bg: 'bg-[var(--teal)]',
    bgGradient: 'bg-[var(--forest)]',
    text: 'text-[var(--teal)]',
    border: 'border-[var(--bamboo-200)]',
    accent: 'bg-[var(--teal)]',
    light: 'bg-[var(--bamboo-50)]',
  },
};
