/**
 * Tests for progress tracking API
 * Verifies lesson completion and progress management functionality
 */

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/progress/route';
import { createMockSession, mockUsers } from './test-utils';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    lessonProgress: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('Progress API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/progress', () => {
    const createGetRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost/api/progress');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return new NextRequest(url);
    };

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        const request = createGetRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should return 401 when session has no user ID', async () => {
        mockAuth.mockResolvedValue({ user: {}, expires: '' });

        const request = createGetRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Success cases', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
      });

      it('should return all completed lessons for user', async () => {
        const mockProgress = [
          {
            lessonId: 'lesson-1',
            completedAt: new Date('2024-01-15'),
            notes: 'Great lesson',
            course: { slug: 'intro-course' },
          },
          {
            lessonId: 'lesson-2',
            completedAt: new Date('2024-01-16'),
            notes: null,
            course: { slug: 'intro-course' },
          },
        ];
        (prisma.lessonProgress.findMany as jest.Mock).mockResolvedValue(mockProgress);

        const request = createGetRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.completedLessons).toHaveLength(2);
        expect(data.count).toBe(2);
        expect(data.completedLessons[0]).toEqual({
          lessonId: 'lesson-1',
          courseSlug: 'intro-course',
          completedAt: '2024-01-15T00:00:00.000Z',
          notes: 'Great lesson',
        });
      });

      it('should filter by courseSlug when provided', async () => {
        (prisma.lessonProgress.findMany as jest.Mock).mockResolvedValue([]);

        const request = createGetRequest({ courseSlug: 'specific-course' });
        await GET(request);

        expect(prisma.lessonProgress.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: 'student-id',
              course: { slug: 'specific-course' },
            },
          })
        );
      });

      it('should return empty array when no progress exists', async () => {
        (prisma.lessonProgress.findMany as jest.Mock).mockResolvedValue([]);

        const request = createGetRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.completedLessons).toEqual([]);
        expect(data.count).toBe(0);
      });

      it('should order by completedAt descending', async () => {
        (prisma.lessonProgress.findMany as jest.Mock).mockResolvedValue([]);

        const request = createGetRequest();
        await GET(request);

        expect(prisma.lessonProgress.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { completedAt: 'desc' },
          })
        );
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
        (prisma.lessonProgress.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = createGetRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to fetch progress');
      });
    });
  });

  describe('POST /api/progress', () => {
    const createPostRequest = (body: Record<string, unknown>) => {
      return new NextRequest('http://localhost/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        const request = createPostRequest({ lessonId: 'lesson-1', courseSlug: 'course-1' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Validation', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
      });

      it('should return 400 when lessonId is missing', async () => {
        const request = createPostRequest({ courseSlug: 'course-1' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('should return 400 when courseSlug is missing', async () => {
        const request = createPostRequest({ lessonId: 'lesson-1' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('should return 400 when lessonId is empty string', async () => {
        const request = createPostRequest({ lessonId: '', courseSlug: 'course-1' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
      });
    });

    describe('Course verification', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
      });

      it('should return 404 when course not found', async () => {
        (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

        const request = createPostRequest({ lessonId: 'lesson-1', courseSlug: 'nonexistent' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Course not found');
      });
    });

    describe('Success cases', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
        (prisma.course.findUnique as jest.Mock).mockResolvedValue({ id: 'course-uuid' });
      });

      it('should mark lesson as complete', async () => {
        const now = new Date();
        (prisma.lessonProgress.upsert as jest.Mock).mockResolvedValue({
          id: 'progress-1',
          lessonId: 'lesson-1',
          completedAt: now,
          notes: null,
        });

        const request = createPostRequest({ lessonId: 'lesson-1', courseSlug: 'intro-course' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.progress.lessonId).toBe('lesson-1');
        expect(data.progress.completedAt).toBeDefined();
      });

      it('should include notes when provided', async () => {
        (prisma.lessonProgress.upsert as jest.Mock).mockResolvedValue({
          id: 'progress-1',
          lessonId: 'lesson-1',
          completedAt: new Date(),
          notes: 'My notes',
        });

        const request = createPostRequest({
          lessonId: 'lesson-1',
          courseSlug: 'intro-course',
          notes: 'My notes'
        });
        const response = await POST(request);
        const data = await response.json();

        expect(data.progress.notes).toBe('My notes');
      });

      it('should upsert progress correctly', async () => {
        (prisma.lessonProgress.upsert as jest.Mock).mockResolvedValue({
          id: 'progress-1',
          lessonId: 'lesson-1',
          completedAt: new Date(),
          notes: null,
        });

        const request = createPostRequest({ lessonId: 'lesson-1', courseSlug: 'intro-course' });
        await POST(request);

        expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId_lessonId: {
                userId: 'student-id',
                lessonId: 'lesson-1',
              },
            },
            create: expect.objectContaining({
              userId: 'student-id',
              courseId: 'course-uuid',
              lessonId: 'lesson-1',
            }),
          })
        );
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
        (prisma.course.findUnique as jest.Mock).mockResolvedValue({ id: 'course-uuid' });
        (prisma.lessonProgress.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = createPostRequest({ lessonId: 'lesson-1', courseSlug: 'intro-course' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to mark lesson complete');
      });
    });
  });

  describe('DELETE /api/progress', () => {
    const createDeleteRequest = (body: Record<string, unknown>) => {
      return new NextRequest('http://localhost/api/progress', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        const request = createDeleteRequest({ lessonId: 'lesson-1' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Validation', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
      });

      it('should return 400 when lessonId is missing', async () => {
        const request = createDeleteRequest({});
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('should return 400 when lessonId is empty', async () => {
        const request = createDeleteRequest({ lessonId: '' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
      });
    });

    describe('Success cases', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
      });

      it('should mark lesson as incomplete', async () => {
        (prisma.lessonProgress.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

        const request = createDeleteRequest({ lessonId: 'lesson-1' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Progress removed');
      });

      it('should only delete progress for current user', async () => {
        (prisma.lessonProgress.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

        const request = createDeleteRequest({ lessonId: 'lesson-1' });
        await DELETE(request);

        expect(prisma.lessonProgress.deleteMany).toHaveBeenCalledWith({
          where: {
            userId: 'student-id',
            lessonId: 'lesson-1',
          },
        });
      });

      it('should succeed even if no progress exists', async () => {
        (prisma.lessonProgress.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

        const request = createDeleteRequest({ lessonId: 'nonexistent-lesson' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.student));
        (prisma.lessonProgress.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = createDeleteRequest({ lessonId: 'lesson-1' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to remove progress');
      });
    });
  });

  describe('Role-based access', () => {
    it('should allow any authenticated user to track their own progress', async () => {
      // Test with different roles
      const roles = [mockUsers.student, mockUsers.instructor, mockUsers.admin, mockUsers.superAdmin];

      for (const user of roles) {
        mockAuth.mockResolvedValue(createMockSession(user));
        (prisma.lessonProgress.findMany as jest.Mock).mockResolvedValue([]);

        const request = new NextRequest('http://localhost/api/progress');
        const response = await GET(request);

        expect(response.status).toBe(200);
      }
    });
  });
});
