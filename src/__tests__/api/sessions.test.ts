/**
 * API Tests: Sessions
 * Tests for /api/cohorts/[id]/sessions and /api/sessions/[sessionId] endpoints
 */

// Mock auth before importing
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock Prisma
const mockPrismaSessionDelivery = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockPrismaCohort = {
  findUnique: jest.fn(),
};

const mockPrismaCohortInstructor = {
  findUnique: jest.fn(),
};

const mockPrismaLesson = {
  findUnique: jest.fn(),
};

const mockPrismaLearner = {
  findMany: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: {
    sessionDelivery: mockPrismaSessionDelivery,
    cohort: mockPrismaCohort,
    cohortInstructor: mockPrismaCohortInstructor,
    curriculumLesson: mockPrismaLesson,
    learner: mockPrismaLearner,
    auditLog: mockPrismaAuditLog,
  },
}));

// Import handlers after mocking
import { GET as getSessions, POST as createSession } from '@/app/api/cohorts/[id]/sessions/route';
import { GET as getSession, PATCH as updateSession } from '@/app/api/sessions/[sessionId]/route';

describe('GET /api/cohorts/[id]/sessions', () => {
  const cohortId = 'cohort-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions');
      const response = await getSessions(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for STUDENT role', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'student-1', role: 'STUDENT' },
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions');
      const response = await getSessions(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(403);
    });

    it('should allow ADMIN to access', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockPrismaSessionDelivery.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions');
      const response = await getSessions(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(200);
    });

    it('should allow assigned INSTRUCTOR to access', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-1', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue({ userId: 'instructor-1', cohortId });
      mockPrismaSessionDelivery.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions');
      const response = await getSessions(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(200);
    });

    it('should return 403 for unassigned INSTRUCTOR', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-2', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions');
      const response = await getSessions(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should return sessions ordered by scheduled date', async () => {
      mockPrismaSessionDelivery.findMany.mockResolvedValue([
        { id: 'session-1', scheduledDate: new Date('2024-03-01'), lesson: { title: 'Lesson 1' } },
        { id: 'session-2', scheduledDate: new Date('2024-03-08'), lesson: { title: 'Lesson 2' } },
      ]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions');
      const response = await getSessions(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveLength(2);
    });
  });
});

describe('POST /api/cohorts/[id]/sessions', () => {
  const cohortId = 'cohort-123';
  const validSessionData = {
    lessonId: 'lesson-123',
    scheduledDate: '2024-03-15T09:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaCohort.findUnique.mockResolvedValue({ id: cohortId, name: 'Test Cohort' });
    mockPrismaLesson.findUnique.mockResolvedValue({ id: validSessionData.lessonId, title: 'Test Lesson' });
    mockPrismaSessionDelivery.findFirst.mockResolvedValue(null); // No duplicate
    mockPrismaSessionDelivery.create.mockResolvedValue({
      id: 'new-session-id',
      ...validSessionData,
      cohortId,
      lesson: { title: 'Test Lesson', module: { title: 'Module 1' } },
    });
    mockPrismaAuditLog.create.mockResolvedValue({});
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(401);
    });

    it('should allow ADMIN to create sessions', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);
    });

    it('should allow assigned INSTRUCTOR to create sessions', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-1', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue({ userId: 'instructor-1', cohortId });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should reject missing lessonId', async () => {
      const { lessonId, ...dataWithoutLesson } = validSessionData;
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(dataWithoutLesson),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject missing scheduledDate', async () => {
      const { scheduledDate, ...dataWithoutDate } = validSessionData;
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(dataWithoutDate),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify({ ...validSessionData, scheduledDate: '2024-03-15' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: 'not-valid-json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });
  });

  describe('Business Rules', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should return 404 if cohort does not exist', async () => {
      mockPrismaCohort.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toContain('Cohort not found');
    });

    it('should return 404 if lesson does not exist', async () => {
      mockPrismaLesson.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toContain('Lesson not found');
    });

    it('should return 400 if duplicate session exists for same lesson and date', async () => {
      mockPrismaSessionDelivery.findFirst.mockResolvedValue({
        id: 'existing-session',
        lessonId: validSessionData.lessonId,
        scheduledDate: new Date(validSessionData.scheduledDate),
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('already exists');
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should create session with valid data', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createSession(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);

      expect(mockPrismaSessionDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cohortId,
            lessonId: validSessionData.lessonId,
          }),
        })
      );
    });

    it('should create audit log on session creation', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData),
        headers: { 'Content-Type': 'application/json' },
      });

      await createSession(request, { params: Promise.resolve({ id: cohortId }) });

      expect(mockPrismaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SESSION_CREATED',
            entity: 'SESSION',
          }),
        })
      );
    });
  });
});

describe('GET /api/sessions/[sessionId]', () => {
  const sessionId = 'session-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/sessions/session-123');
      const response = await getSession(request, { params: Promise.resolve({ sessionId }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if session does not exist', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockPrismaSessionDelivery.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/sessions/session-123');
      const response = await getSession(request, { params: Promise.resolve({ sessionId }) });

      expect(response.status).toBe(404);
    });

    it('should allow ADMIN to access any session', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockPrismaSessionDelivery.findUnique.mockResolvedValue({
        id: sessionId,
        cohortId: 'cohort-123',
        cohort: { id: 'cohort-123', name: 'Test Cohort', code: 'TC-01' },
        lesson: { id: 'lesson-1', title: 'Lesson 1', blocks: [], module: {} },
        attendance: [],
        checklistProgress: [],
        timerLogs: [],
      });
      mockPrismaLearner.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/sessions/session-123');
      const response = await getSession(request, { params: Promise.resolve({ sessionId }) });

      expect(response.status).toBe(200);
    });

    it('should return 403 for unassigned INSTRUCTOR', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-2', role: 'INSTRUCTOR' },
      });
      mockPrismaSessionDelivery.findUnique.mockResolvedValue({
        id: sessionId,
        cohortId: 'cohort-123',
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/sessions/session-123');
      const response = await getSession(request, { params: Promise.resolve({ sessionId }) });

      expect(response.status).toBe(403);
    });
  });
});

describe('PATCH /api/sessions/[sessionId]', () => {
  const sessionId = 'session-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaSessionDelivery.findUnique.mockResolvedValue({
      id: sessionId,
      cohortId: 'cohort-123',
    });
    mockPrismaSessionDelivery.update.mockResolvedValue({
      id: sessionId,
      status: 'IN_PROGRESS',
      lesson: { id: 'lesson-1', title: 'Lesson 1' },
      cohort: { id: 'cohort-123', name: 'Test Cohort' },
    });
    mockPrismaAuditLog.create.mockResolvedValue({});
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should reject invalid status', async () => {
      const request = new Request('http://localhost:3000/api/sessions/session-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateSession(request, { params: Promise.resolve({ sessionId }) });
      expect(response.status).toBe(400);
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

      for (const status of validStatuses) {
        mockPrismaSessionDelivery.update.mockResolvedValue({
          id: sessionId,
          status,
          lesson: { title: 'Lesson 1' },
          cohort: { name: 'Cohort 1' },
        });

        const request = new Request('http://localhost:3000/api/sessions/session-123', {
          method: 'PATCH',
          body: JSON.stringify({ status }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await updateSession(request, { params: Promise.resolve({ sessionId }) });
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Auto-Time Setting', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should auto-set actualStart when status becomes IN_PROGRESS', async () => {
      const request = new Request('http://localhost:3000/api/sessions/session-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await updateSession(request, { params: Promise.resolve({ sessionId }) });

      expect(mockPrismaSessionDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            actualStart: expect.any(Date),
          }),
        })
      );
    });

    it('should auto-set actualEnd when status becomes COMPLETED', async () => {
      const request = new Request('http://localhost:3000/api/sessions/session-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await updateSession(request, { params: Promise.resolve({ sessionId }) });

      expect(mockPrismaSessionDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            actualEnd: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should create audit log for status changes', async () => {
      const request = new Request('http://localhost:3000/api/sessions/session-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await updateSession(request, { params: Promise.resolve({ sessionId }) });

      expect(mockPrismaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SESSION_COMPLETED',
            entity: 'SESSION',
            entityId: sessionId,
          }),
        })
      );
    });

    it('should not create audit log for non-status updates', async () => {
      const request = new Request('http://localhost:3000/api/sessions/session-123', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await updateSession(request, { params: Promise.resolve({ sessionId }) });

      expect(mockPrismaAuditLog.create).not.toHaveBeenCalled();
    });
  });
});
