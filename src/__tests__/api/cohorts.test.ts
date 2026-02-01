/**
 * API Tests: Cohorts
 * Tests for /api/cohorts and /api/cohorts/[id] endpoints
 */

// Mock auth before importing
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock Prisma
const mockPrismaCohort = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaCourse = {
  findUnique: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: {
    cohort: mockPrismaCohort,
    curriculumCourse: mockPrismaCourse,
    auditLog: mockPrismaAuditLog,
  },
}));

// Import handlers after mocking
import { GET, POST } from '@/app/api/cohorts/route';

// Helper to create mock requests
function createRequest(url: string, options: RequestInit = {}) {
  return new Request(url, options);
}

describe('GET /api/cohorts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest('http://localhost:3000/api/cohorts');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 for STUDENT role', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'STUDENT' },
      });

      const request = createRequest('http://localhost:3000/api/cohorts');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });
  });

  describe('Authorization', () => {
    it('should allow ADMIN to see all cohorts', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockPrismaCohort.findMany.mockResolvedValue([
        { id: 'cohort-1', name: 'Cohort 1' },
        { id: 'cohort-2', name: 'Cohort 2' },
      ]);

      const request = createRequest('http://localhost:3000/api/cohorts');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveLength(2);
    });

    it('should allow SUPER_ADMIN to see all cohorts', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'super-admin-1', role: 'SUPER_ADMIN' },
      });
      mockPrismaCohort.findMany.mockResolvedValue([]);

      const request = createRequest('http://localhost:3000/api/cohorts');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should filter cohorts for INSTRUCTOR to only their assigned ones', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-1', role: 'INSTRUCTOR' },
      });
      mockPrismaCohort.findMany.mockResolvedValue([
        { id: 'cohort-1', name: 'My Cohort' },
      ]);

      const request = createRequest('http://localhost:3000/api/cohorts');
      await GET(request);

      // Verify the where clause filters by instructor
      expect(mockPrismaCohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            instructors: {
              some: { userId: 'instructor-1' },
            },
          }),
        })
      );
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockPrismaCohort.findMany.mockResolvedValue([]);
    });

    it('should filter by status', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts?status=ACTIVE');
      await GET(request);

      expect(mockPrismaCohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by courseId', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts?courseId=course-123');
      await GET(request);

      expect(mockPrismaCohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            courseId: 'course-123',
          }),
        })
      );
    });
  });
});

describe('POST /api/cohorts', () => {
  const validCohortData = {
    name: 'Spring 2024 Cohort',
    code: 'SPRING-2024',
    courseId: '550e8400-e29b-41d4-a716-446655440000',
    startDate: '2024-03-01T09:00:00.000Z',
    endDate: '2024-06-01T17:00:00.000Z',
    maxLearners: 12,
    instructorIds: ['instructor-1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaCourse.findUnique.mockResolvedValue({ id: validCohortData.courseId, title: 'Test Course' });
    mockPrismaCohort.findUnique.mockResolvedValue(null); // No existing cohort with same code
    mockPrismaCohort.create.mockResolvedValue({
      id: 'new-cohort-id',
      ...validCohortData,
      course: { title: 'Test Course' },
      instructors: [],
    });
    mockPrismaAuditLog.create.mockResolvedValue({});
  });

  describe('Authentication & Authorization', () => {
    it('should return 403 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should return 403 for INSTRUCTOR role', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-1', role: 'INSTRUCTOR' },
      });

      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should allow ADMIN to create cohorts', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('should allow SUPER_ADMIN to create cohorts', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'super-admin-1', role: 'SUPER_ADMIN' },
      });

      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should reject missing name', async () => {
      const { name, ...dataWithoutName } = validCohortData;
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(dataWithoutName),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject missing courseId', async () => {
      const { courseId, ...dataWithoutCourseId } = validCohortData;
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(dataWithoutCourseId),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject missing instructorIds', async () => {
      const { instructorIds, ...dataWithoutInstructors } = validCohortData;
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(dataWithoutInstructors),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject empty instructorIds array', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify({ ...validCohortData, instructorIds: [] }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject invalid code format (lowercase)', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify({ ...validCohortData, code: 'invalid-code' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify({ ...validCohortData, startDate: '2024-03-01' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject invalid JSON', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: 'not-valid-json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Invalid JSON');
    });
  });

  describe('Business Rules', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should return 404 if course does not exist', async () => {
      mockPrismaCourse.findUnique.mockResolvedValue(null);

      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe('Course not found');
    });

    it('should return 400 if cohort code already exists', async () => {
      mockPrismaCohort.findUnique.mockResolvedValue({ id: 'existing-cohort', code: validCohortData.code });

      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
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

    it('should create cohort with valid data', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      expect(mockPrismaCohort.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: validCohortData.name,
            code: validCohortData.code,
            courseId: validCohortData.courseId,
          }),
        })
      );
    });

    it('should create cohort without optional endDate', async () => {
      const { endDate, ...dataWithoutEndDate } = validCohortData;
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(dataWithoutEndDate),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('should create audit log on success', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(validCohortData),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockPrismaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COHORT_CREATED',
            entity: 'COHORT',
          }),
        })
      );
    });

    it('should assign first instructor as LEAD', async () => {
      const request = createRequest('http://localhost:3000/api/cohorts', {
        method: 'POST',
        body: JSON.stringify({ ...validCohortData, instructorIds: ['lead-instructor', 'assistant-instructor'] }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockPrismaCohort.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instructors: {
              create: expect.arrayContaining([
                expect.objectContaining({ userId: 'lead-instructor', role: 'LEAD' }),
                expect.objectContaining({ userId: 'assistant-instructor', role: 'ASSISTANT' }),
              ]),
            },
          }),
        })
      );
    });
  });
});
