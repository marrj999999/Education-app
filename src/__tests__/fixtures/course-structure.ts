/**
 * Test fixtures for course navigation structure
 * Reusable mock data for tests that need CourseNavigation trees
 */

import type { Module, Lesson, CourseNavigation, Course } from '@/lib/types';

export const mockLesson1: Lesson = {
  id: 'lesson-001',
  title: 'Introduction to Bamboo',
  moduleId: 'module-1',
  icon: '🎋',
  duration: '45 min',
  order: 0,
};

export const mockLesson2: Lesson = {
  id: 'lesson-002',
  title: 'Tool Safety',
  moduleId: 'module-1',
  icon: '🔧',
  duration: '30 min',
  order: 1,
};

export const mockLesson3: Lesson = {
  id: 'lesson-003',
  title: 'Bamboo Selection',
  moduleId: 'module-1',
  order: 2,
};

export const mockLesson4: Lesson = {
  id: 'lesson-004',
  title: 'Frame Design Principles',
  moduleId: 'module-2',
  icon: '📐',
  duration: '60 min',
  order: 0,
};

export const mockLesson5: Lesson = {
  id: 'lesson-005',
  title: 'Jointing Techniques',
  moduleId: 'module-2',
  order: 1,
};

export const mockModule1: Module = {
  id: 'module-1',
  title: 'Getting Started',
  icon: '📚',
  lessons: [mockLesson1, mockLesson2, mockLesson3],
  order: 0,
};

export const mockModule2: Module = {
  id: 'module-2',
  title: 'Frame Construction',
  icon: '🔨',
  lessons: [mockLesson4, mockLesson5],
  order: 1,
};

export const mockEmptyModule: Module = {
  id: 'module-empty',
  title: 'Upcoming Content',
  lessons: [],
  order: 2,
};

export const mockCourseNavigation: CourseNavigation = {
  modules: [mockModule1, mockModule2],
  resources: [],
  handbooks: [],
};

export const mockCourseNavigationWithEmpty: CourseNavigation = {
  modules: [mockModule1, mockModule2, mockEmptyModule],
  resources: [],
  handbooks: [],
};

export const emptyCourseNavigation: CourseNavigation = {
  modules: [],
  resources: [],
  handbooks: [],
};

export const mockCourse: Course = {
  id: 'workshop-skills',
  slug: 'workshop-skills',
  title: '6 Week Workshop Skills',
  shortTitle: 'Workshop Skills',
  description: 'Learn bamboo bicycle building',
  icon: 'wrench',
  color: 'green',
  duration: '6 weeks',
  level: 'Level 1-3',
  accreditation: 'OCN',
  enabled: true,
};

export const mockDisabledCourse: Course = {
  id: 'sustainable-manufacturing',
  slug: 'sustainable-manufacturing',
  title: 'Sustainable Manufacturing',
  shortTitle: 'Sustainable Mfg',
  description: 'Learn sustainable manufacturing',
  icon: 'bicycle',
  color: 'emerald',
  duration: '8 weeks',
  level: 'Level 2-3',
  accreditation: 'OCN',
  enabled: false,
};

export const mockHandbookCourse: Course = {
  id: 'flax-manual-handbook',
  slug: 'flax-manual-handbook',
  title: 'Flax Manual Handbook',
  shortTitle: 'Flax Manual',
  description: 'Complete assembly guide',
  icon: 'book',
  color: 'teal',
  duration: 'Reference',
  level: 'All Levels',
  enabled: true,
  isHandbook: true,
};
