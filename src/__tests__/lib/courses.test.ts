/**
 * Tests for course configuration and lookup functions
 * Verifies course data, filtering, and color theme mapping
 */

import {
  COURSES,
  getEnabledCourses,
  getAllCourses,
  getCourseBySlug,
  getCourseById,
  getDefaultCourse,
  COURSE_COLOR_THEMES,
} from '@/lib/courses';
import type { Course } from '@/lib/types';

describe('Course Configuration', () => {
  describe('COURSES constant', () => {
    it('should contain at least one course', () => {
      expect(COURSES.length).toBeGreaterThanOrEqual(1);
    });

    it('should have unique IDs for all courses', () => {
      const ids = COURSES.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique slugs for all courses', () => {
      const slugs = COURSES.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('should have required fields on every course', () => {
      COURSES.forEach((course) => {
        expect(course.id).toBeTruthy();
        expect(course.slug).toBeTruthy();
        expect(course.title).toBeTruthy();
        expect(course.shortTitle).toBeTruthy();
        expect(course.description).toBeTruthy();
        expect(course.icon).toBeTruthy();
        expect(course.color).toBeTruthy();
        expect(course.duration).toBeTruthy();
        expect(course.level).toBeTruthy();
        expect(typeof course.enabled).toBe('boolean');
      });
    });

    it('should have at least one enabled course', () => {
      const enabledCount = COURSES.filter((c) => c.enabled).length;
      expect(enabledCount).toBeGreaterThanOrEqual(1);
    });

    it('should have workshop-skills course', () => {
      const ws = COURSES.find((c) => c.slug === 'workshop-skills');
      expect(ws).toBeDefined();
      expect(ws?.enabled).toBe(true);
      expect(ws?.accreditation).toBe('OCN');
    });

    it('should have flax-manual-handbook as a handbook course', () => {
      const flax = COURSES.find((c) => c.slug === 'flax-manual-handbook');
      expect(flax).toBeDefined();
      expect(flax?.isHandbook).toBe(true);
    });
  });

  describe('getEnabledCourses', () => {
    it('should return only enabled courses', () => {
      const enabled = getEnabledCourses();
      enabled.forEach((course) => {
        expect(course.enabled).toBe(true);
      });
    });

    it('should not return disabled courses', () => {
      const disabledCourses = COURSES.filter((c) => !c.enabled);
      const enabled = getEnabledCourses();
      disabledCourses.forEach((dc) => {
        expect(enabled.find((c) => c.id === dc.id)).toBeUndefined();
      });
    });

    it('should return fewer courses than getAllCourses when disabled courses exist', () => {
      const hasDisabled = COURSES.some((c) => !c.enabled);
      if (hasDisabled) {
        expect(getEnabledCourses().length).toBeLessThan(getAllCourses().length);
      }
    });
  });

  describe('getAllCourses', () => {
    it('should return all courses including disabled', () => {
      expect(getAllCourses().length).toBe(COURSES.length);
    });

    it('should return the same array reference as COURSES', () => {
      expect(getAllCourses()).toBe(COURSES);
    });
  });

  describe('getCourseBySlug', () => {
    it('should find a course by its slug', () => {
      const course = getCourseBySlug('workshop-skills');
      expect(course).toBeDefined();
      expect(course?.slug).toBe('workshop-skills');
      expect(course?.title).toBe('6 Week Workshop Skills');
    });

    it('should return undefined for non-existent slug', () => {
      expect(getCourseBySlug('non-existent')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getCourseBySlug('')).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      expect(getCourseBySlug('Workshop-Skills')).toBeUndefined();
    });
  });

  describe('getCourseById', () => {
    it('should find a course by its ID', () => {
      const course = getCourseById('workshop-skills');
      expect(course).toBeDefined();
      expect(course?.id).toBe('workshop-skills');
    });

    it('should return undefined for non-existent ID', () => {
      expect(getCourseById('xyz-999')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getCourseById('')).toBeUndefined();
    });
  });

  describe('getDefaultCourse', () => {
    it('should return the first enabled course', () => {
      const defaultCourse = getDefaultCourse();
      const enabledCourses = getEnabledCourses();
      expect(defaultCourse).toBe(enabledCourses[0]);
    });

    it('should return an enabled course', () => {
      const defaultCourse = getDefaultCourse();
      expect(defaultCourse?.enabled).toBe(true);
    });
  });

  describe('COURSE_COLOR_THEMES', () => {
    const expectedColors = ['green', 'emerald', 'blue', 'purple', 'amber', 'teal'];

    it('should have all expected color themes', () => {
      expectedColors.forEach((color) => {
        expect(COURSE_COLOR_THEMES[color]).toBeDefined();
      });
    });

    it('should have all required properties on each theme', () => {
      Object.values(COURSE_COLOR_THEMES).forEach((theme) => {
        expect(theme.bg).toBeTruthy();
        expect(theme.bgGradient).toBeTruthy();
        expect(theme.text).toBeTruthy();
        expect(theme.border).toBeTruthy();
        expect(theme.accent).toBeTruthy();
        expect(theme.light).toBeTruthy();
      });
    });

    it('should use Tailwind class naming conventions (including CSS variable syntax)', () => {
      Object.values(COURSE_COLOR_THEMES).forEach((theme) => {
        expect(theme.bg).toMatch(/^bg-/);
        expect(theme.text).toMatch(/^text-/);
        expect(theme.border).toMatch(/^border-/);
      });
    });

    it('should have a matching theme for every course color', () => {
      COURSES.forEach((course) => {
        expect(COURSE_COLOR_THEMES[course.color]).toBeDefined();
      });
    });
  });
});
