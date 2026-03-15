/**
 * Tests for Payload CMS query functions
 * Verifies course structure, lesson content, and handbook queries
 */

// Mock the payload module
jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('@payload-config', () => ({}), { virtual: true });

import { getPayload } from 'payload';
import {
  getPayloadLesson,
  getPayloadLessonById,
  getPayloadCourses,
  getPayloadCourseBySlug,
  getPayloadModules,
  getPayloadCourseStructure,
  getPayloadCourseNavigation,
  getPayloadLessonContent,
  getPayloadSiblingLessons,
  getPayloadHandbookSections,
  getPayloadHandbookBySlug,
} from '@/lib/payload/queries';

const mockPayload = {
  find: jest.fn(),
  findByID: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

(getPayload as jest.Mock).mockResolvedValue(mockPayload);

describe('Payload CMS Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
  });

  describe('getPayloadLesson', () => {
    it('should find a lesson by slug', async () => {
      const mockLesson = { id: 'lesson-1', title: 'Test Lesson', slug: 'test-lesson' };
      mockPayload.find.mockResolvedValue({ docs: [mockLesson] });

      const result = await getPayloadLesson('test-lesson');
      expect(result).toEqual(mockLesson);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'lessons',
        where: { slug: { equals: 'test-lesson' } },
        limit: 1,
        depth: 1,
      });
    });

    it('should return null when lesson not found', async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });
      const result = await getPayloadLesson('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockPayload.find.mockRejectedValue(new Error('DB error'));
      const result = await getPayloadLesson('test');
      expect(result).toBeNull();
    });
  });

  describe('getPayloadLessonById', () => {
    it('should find a lesson by ID', async () => {
      const mockLesson = { id: 'abc123', title: 'Found Lesson' };
      mockPayload.findByID.mockResolvedValue(mockLesson);

      const result = await getPayloadLessonById('abc123');
      expect(result).toEqual(mockLesson);
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'lessons',
        id: 'abc123',
        depth: 1,
      });
    });

    it('should return null on error', async () => {
      mockPayload.findByID.mockRejectedValue(new Error('Not found'));
      const result = await getPayloadLessonById('bad-id');
      expect(result).toBeNull();
    });
  });

  describe('getPayloadCourses', () => {
    it('should return all courses', async () => {
      const courses = [
        { id: 'c1', title: 'Course 1' },
        { id: 'c2', title: 'Course 2' },
      ];
      mockPayload.find.mockResolvedValue({ docs: courses });

      const result = await getPayloadCourses();
      expect(result).toEqual(courses);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'courses',
        sort: 'order',
        depth: 2,
        limit: 100,
      });
    });

    it('should return empty array on error', async () => {
      mockPayload.find.mockRejectedValue(new Error('DB error'));
      const result = await getPayloadCourses();
      expect(result).toEqual([]);
    });
  });

  describe('getPayloadCourseBySlug', () => {
    it('should find course by slug', async () => {
      const course = { id: 'c1', title: 'Workshop', slug: 'workshop-skills' };
      mockPayload.find.mockResolvedValue({ docs: [course] });

      const result = await getPayloadCourseBySlug('workshop-skills');
      expect(result).toEqual(course);
    });

    it('should return null when not found', async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });
      const result = await getPayloadCourseBySlug('nope');
      expect(result).toBeNull();
    });
  });

  describe('getPayloadCourseStructure', () => {
    it('should return full course tree with modules and lessons', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          {
            id: 'course-1',
            title: 'Workshop Skills',
            slug: 'workshop-skills',
            modules: [
              {
                id: 'mod-1',
                title: 'Getting Started',
                icon: '📚',
                order: 0,
                lessons: [
                  { id: 'l1', title: 'Intro', order: 0, icon: '🎯' },
                  { id: 'l2', title: 'Tools', order: 1 },
                ],
              },
              {
                id: 'mod-2',
                title: 'Advanced',
                order: 1,
                lessons: [
                  { id: 'l3', title: 'Jointing', order: 0 },
                ],
              },
            ],
          },
        ],
      });

      const result = await getPayloadCourseStructure('workshop-skills');

      expect(result.modules).toHaveLength(2);
      expect(result.modules[0].id).toBe('mod-1');
      expect(result.modules[0].title).toBe('Getting Started');
      expect(result.modules[0].lessons).toHaveLength(2);
      expect(result.modules[0].lessons[0].id).toBe('l1');
      expect(result.modules[0].lessons[0].moduleId).toBe('mod-1');
      expect(result.modules[1].lessons).toHaveLength(1);
      expect(result.resources).toEqual([]);
      expect(result.handbooks).toEqual([]);
    });

    it('should sort modules by order', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          {
            modules: [
              { id: 'm2', title: 'Second', order: 1, lessons: [] },
              { id: 'm1', title: 'First', order: 0, lessons: [] },
            ],
          },
        ],
      });

      const result = await getPayloadCourseStructure('test');
      expect(result.modules[0].id).toBe('m1');
      expect(result.modules[1].id).toBe('m2');
    });

    it('should sort lessons by order within modules', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          {
            modules: [
              {
                id: 'm1',
                title: 'Module',
                order: 0,
                lessons: [
                  { id: 'l3', title: 'Third', order: 2 },
                  { id: 'l1', title: 'First', order: 0 },
                  { id: 'l2', title: 'Second', order: 1 },
                ],
              },
            ],
          },
        ],
      });

      const result = await getPayloadCourseStructure('test');
      expect(result.modules[0].lessons.map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
    });

    it('should return empty structure when course not found', async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });

      const result = await getPayloadCourseStructure('nonexistent');
      expect(result).toEqual({ modules: [], resources: [], handbooks: [] });
    });

    it('should skip string module references (unpopulated)', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          {
            modules: ['mod-id-string', { id: 'm1', title: 'Real Module', order: 0, lessons: [] }],
          },
        ],
      });

      const result = await getPayloadCourseStructure('test');
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].id).toBe('m1');
    });

    it('should return empty structure on error', async () => {
      mockPayload.find.mockRejectedValue(new Error('Failed'));

      const result = await getPayloadCourseStructure('test');
      expect(result).toEqual({ modules: [], resources: [], handbooks: [] });
    });
  });

  describe('getPayloadCourseNavigation', () => {
    it('should build navigation structure with URLs', async () => {
      // Mock for getPayloadCourseStructure call
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'course-1',
            title: 'Workshop Skills',
            modules: [
              {
                id: 'm1',
                title: 'Module 1',
                order: 0,
                lessons: [
                  { id: 'l1', title: 'Lesson 1', order: 0 },
                ],
              },
            ],
          },
        ],
      });

      // Mock for getPayloadCourseBySlug call
      mockPayload.find.mockResolvedValueOnce({
        docs: [{ id: 'course-1', title: 'Workshop Skills', slug: 'workshop-skills' }],
      });

      const result = await getPayloadCourseNavigation('workshop-skills');

      expect(result.courseSlug).toBe('workshop-skills');
      expect(result.courseTitle).toBe('Workshop Skills');
      expect(result.totalLessons).toBe(1);
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].standaloneLessons[0].url).toBe(
        '/courses/workshop-skills/lessons/l1'
      );
    });
  });

  describe('getPayloadLessonContent', () => {
    it('should return page metadata and sections', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 'lesson-1',
        title: 'Test Lesson',
        icon: '🔧',
        coverImage: { url: '/images/cover.jpg' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
        sections: [
          { id: 'h1', blockType: 'heading', level: '1', text: 'Title' },
        ],
      });

      const result = await getPayloadLessonContent('lesson-1');

      expect(result).not.toBeNull();
      expect(result?.page.id).toBe('lesson-1');
      expect(result?.page.title).toBe('Test Lesson');
      expect(result?.page.icon).toBe('🔧');
      expect(result?.sections).toHaveLength(1);
    });

    it('should return null when lesson not found', async () => {
      mockPayload.findByID.mockRejectedValue(new Error('Not found'));

      const result = await getPayloadLessonContent('bad-id');
      expect(result).toBeNull();
    });
  });

  describe('getPayloadSiblingLessons', () => {
    it('should return sorted sibling lessons from the same module', async () => {
      // First findByID: get the lesson to find its module
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'l2',
        title: 'Lesson 2',
        module: { id: 'mod-1' },
      });

      // Second findByID: get the module with all lessons
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'mod-1',
        title: 'Module 1',
        lessons: [
          { id: 'l1', title: 'Lesson 1', order: 0 },
          { id: 'l2', title: 'Lesson 2', order: 1 },
          { id: 'l3', title: 'Lesson 3', order: 2 },
        ],
      });

      const result = await getPayloadSiblingLessons('l2');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 'l1', title: 'Lesson 1' });
      expect(result[2]).toEqual({ id: 'l3', title: 'Lesson 3' });
    });

    it('should return empty array when lesson not found', async () => {
      mockPayload.findByID.mockRejectedValue(new Error('Not found'));

      const result = await getPayloadSiblingLessons('bad-id');
      expect(result).toEqual([]);
    });
  });

  describe('getPayloadHandbookSections', () => {
    it('should return handbook sections sorted by order', async () => {
      const sections = [
        { id: 'h1', title: 'Section 1', order: 0 },
        { id: 'h2', title: 'Section 2', order: 1 },
      ];
      mockPayload.find.mockResolvedValue({ docs: sections });

      const result = await getPayloadHandbookSections();

      expect(result).toEqual(sections);
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'handbooks',
        sort: 'order',
        limit: 200,
        depth: 1,
      });
    });

    it('should return empty array on error', async () => {
      mockPayload.find.mockRejectedValue(new Error('DB error'));
      const result = await getPayloadHandbookSections();
      expect(result).toEqual([]);
    });
  });

  describe('getPayloadHandbookBySlug', () => {
    it('should find handbook by slug', async () => {
      const handbook = { id: 'h1', slug: 'intro', title: 'Introduction' };
      mockPayload.find.mockResolvedValue({ docs: [handbook] });

      const result = await getPayloadHandbookBySlug('intro');
      expect(result).toEqual(handbook);
    });

    it('should return null when not found', async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });
      const result = await getPayloadHandbookBySlug('nope');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockPayload.find.mockRejectedValue(new Error('Error'));
      const result = await getPayloadHandbookBySlug('test');
      expect(result).toBeNull();
    });
  });
});
