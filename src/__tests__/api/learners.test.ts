/**
 * API Tests: Learners
 * Tests for /api/cohorts/[id]/learners endpoints
 */

// Mock auth before importing
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock Prisma
const mockPrismaLearner = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaCohort = {
  findUnique: jest.fn(),
};

const mockPrismaCohortInstructor = {
  findUnique: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: {
    learner: mockPrismaLearner,
    cohort: mockPrismaCohort,
    cohortInstructor: mockPrismaCohortInstructor,
    auditLog: mockPrismaAuditLog,
  },
}));

// Import handlers after mocking
import { GET as getLearners, POST as createLearner } from '@/app/api/cohorts/[id]/learners/route';

describe('GET /api/cohorts/[id]/learners', () => {
  const cohortId = 'cohort-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 for STUDENT role', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'student-1', role: 'STUDENT' },
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(403);
    });

    it('should allow ADMIN to access', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockPrismaLearner.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(200);
    });

    it('should allow assigned INSTRUCTOR to access', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-1', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue({ userId: 'instructor-1', cohortId });
      mockPrismaLearner.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(200);
    });

    it('should return 403 for unassigned INSTRUCTOR', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-2', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should return learners with enriched data', async () => {
      mockPrismaLearner.findMany.mockResolvedValue([
        {
          id: 'learner-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          attendance: [
            { status: 'PRESENT', session: { scheduledDate: new Date(), status: 'COMPLETED' } },
            { status: 'PRESENT', session: { scheduledDate: new Date(), status: 'COMPLETED' } },
          ],
          assessments: [
            { criterionCode: 'C1', status: 'SIGNED_OFF' },
            { criterionCode: 'C2', status: 'IN_PROGRESS' },
          ],
        },
      ]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body[0]).toMatchObject({
        id: 'learner-1',
        firstName: 'John',
        lastName: 'Doe',
        attendanceRate: 100, // 2/2 present
        assessmentProgress: 50, // 1/2 signed off
        attendanceCount: expect.objectContaining({
          present: 2,
          absent: 0,
        }),
        assessmentCount: expect.objectContaining({
          total: 2,
          signedOff: 1,
          inProgress: 1,
        }),
      });
    });

    it('should return null attendance rate for no completed sessions', async () => {
      mockPrismaLearner.findMany.mockResolvedValue([
        {
          id: 'learner-1',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          attendance: [],
          assessments: [],
        },
      ]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      const body = await response.json();
      expect(body[0].attendanceRate).toBeNull();
      expect(body[0].assessmentProgress).toBeNull();
    });

    it('should sort learners by lastName, firstName', async () => {
      mockPrismaLearner.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      expect(mockPrismaLearner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        })
      );
    });
  });

  describe('Attendance Calculation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should count LATE as present for attendance rate', async () => {
      mockPrismaLearner.findMany.mockResolvedValue([
        {
          id: 'learner-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          attendance: [
            { status: 'PRESENT', session: { scheduledDate: new Date(), status: 'COMPLETED' } },
            { status: 'LATE', session: { scheduledDate: new Date(), status: 'COMPLETED' } },
            { status: 'ABSENT', session: { scheduledDate: new Date(), status: 'COMPLETED' } },
          ],
          assessments: [],
        },
      ]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      const body = await response.json();
      // 2 out of 3 completed sessions (PRESENT + LATE)
      expect(body[0].attendanceRate).toBe(67); // Math.round(2/3 * 100)
    });

    it('should only count completed sessions for attendance rate', async () => {
      mockPrismaLearner.findMany.mockResolvedValue([
        {
          id: 'learner-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          attendance: [
            { status: 'PRESENT', session: { scheduledDate: new Date(), status: 'COMPLETED' } },
            { status: 'ABSENT', session: { scheduledDate: new Date(), status: 'SCHEDULED' } }, // Not counted
          ],
          assessments: [],
        },
      ]);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners');
      const response = await getLearners(request, { params: Promise.resolve({ id: cohortId }) });

      const body = await response.json();
      expect(body[0].attendanceRate).toBe(100); // Only 1 completed, 1 present
    });
  });
});

describe('POST /api/cohorts/[id]/learners', () => {
  const cohortId = 'cohort-123';
  const validLearnerData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+44 7700 900000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaCohort.findUnique.mockResolvedValue({
      id: cohortId,
      name: 'Test Cohort',
      maxLearners: 12,
      _count: { learners: 5 },
    });
    mockPrismaLearner.findUnique.mockResolvedValue(null); // No duplicate
    mockPrismaLearner.create.mockResolvedValue({
      id: 'new-learner-id',
      ...validLearnerData,
      cohortId,
    });
    mockPrismaAuditLog.create.mockResolvedValue({});
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(401);
    });

    it('should allow ADMIN to add learners', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);
    });

    it('should allow assigned INSTRUCTOR to add learners', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-1', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue({ userId: 'instructor-1', cohortId });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);
    });

    it('should return 403 for unassigned INSTRUCTOR', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'instructor-2', role: 'INSTRUCTOR' },
      });
      mockPrismaCohortInstructor.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
    });

    it('should reject missing firstName', async () => {
      const { firstName, ...dataWithoutFirstName } = validLearnerData;
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(dataWithoutFirstName),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject missing lastName', async () => {
      const { lastName, ...dataWithoutLastName } = validLearnerData;
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(dataWithoutLastName),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject missing email', async () => {
      const { email, ...dataWithoutEmail } = validLearnerData;
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(dataWithoutEmail),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify({ ...validLearnerData, email: 'not-an-email' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);
    });

    it('should reject invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: 'not-valid-json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
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

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toContain('Cohort not found');
    });

    it('should return 400 if cohort is at capacity', async () => {
      mockPrismaCohort.findUnique.mockResolvedValue({
        id: cohortId,
        maxLearners: 12,
        _count: { learners: 12 }, // At capacity
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('capacity');
    });

    it('should return 400 if learner email already exists in cohort', async () => {
      mockPrismaLearner.findUnique.mockResolvedValue({
        id: 'existing-learner',
        email: validLearnerData.email,
        cohortId,
      });

      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
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

    it('should create learner with valid data', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);

      expect(mockPrismaLearner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: validLearnerData.firstName,
            lastName: validLearnerData.lastName,
            email: validLearnerData.email,
            cohortId,
          }),
        })
      );
    });

    it('should create learner without optional phone', async () => {
      const { phone, ...dataWithoutPhone } = validLearnerData;
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(dataWithoutPhone),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createLearner(request, { params: Promise.resolve({ id: cohortId }) });
      expect(response.status).toBe(201);
    });

    it('should create audit log on learner creation', async () => {
      const request = new Request('http://localhost:3000/api/cohorts/cohort-123/learners', {
        method: 'POST',
        body: JSON.stringify(validLearnerData),
        headers: { 'Content-Type': 'application/json' },
      });

      await createLearner(request, { params: Promise.resolve({ id: cohortId }) });

      expect(mockPrismaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LEARNER_ADDED',
            entity: 'LEARNER',
          }),
        })
      );
    });
  });
});
