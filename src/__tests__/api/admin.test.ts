/**
 * API Tests: Admin
 * Tests for /api/admin/stats and /api/admin/users endpoints
 */

import { NextRequest } from 'next/server';

// Mock auth before importing
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock permissions
const mockHasPermission = jest.fn();
const mockCanAssignRole = jest.fn();
jest.mock('@/lib/permissions', () => ({
  hasPermission: mockHasPermission,
  canAssignRole: mockCanAssignRole,
}));

// Mock Prisma
const mockPrismaUser = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
};

const mockPrismaCourse = {
  count: jest.fn(),
};

const mockPrismaEnrollment = {
  count: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
  findMany: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: {
    user: mockPrismaUser,
    course: mockPrismaCourse,
    enrollment: mockPrismaEnrollment,
    auditLog: mockPrismaAuditLog,
  },
}));

// Import handlers after mocking
import { GET as getStats } from '@/app/api/admin/stats/route';

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await getStats();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 if user lacks admin:access permission', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'STUDENT' },
      });
      mockHasPermission.mockReturnValue(false);

      const response = await getStats();

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });

    it('should allow ADMIN with admin:access permission', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);

      // Mock all the stats queries
      mockPrismaUser.groupBy.mockResolvedValue([
        { role: 'ADMIN', _count: { id: 2 } },
        { role: 'INSTRUCTOR', _count: { id: 5 } },
        { role: 'STUDENT', _count: { id: 100 } },
      ]);
      mockPrismaUser.count.mockResolvedValue(100);
      mockPrismaCourse.count.mockResolvedValue(10);
      mockPrismaEnrollment.count.mockResolvedValue(50);
      mockPrismaAuditLog.findMany.mockResolvedValue([]);

      const response = await getStats();

      expect(response.status).toBe(200);
    });

    it('should allow SUPER_ADMIN with admin:access permission', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'super-admin-1', role: 'SUPER_ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);

      mockPrismaUser.groupBy.mockResolvedValue([]);
      mockPrismaUser.count.mockResolvedValue(0);
      mockPrismaCourse.count.mockResolvedValue(0);
      mockPrismaEnrollment.count.mockResolvedValue(0);
      mockPrismaAuditLog.findMany.mockResolvedValue([]);

      const response = await getStats();

      expect(response.status).toBe(200);
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);
    });

    it('should return correct stats structure', async () => {
      mockPrismaUser.groupBy.mockResolvedValue([
        { role: 'SUPER_ADMIN', _count: { id: 1 } },
        { role: 'ADMIN', _count: { id: 2 } },
        { role: 'INSTRUCTOR', _count: { id: 5 } },
        { role: 'STUDENT', _count: { id: 100 } },
      ]);
      mockPrismaUser.count
        .mockResolvedValueOnce(105) // active users
        .mockResolvedValueOnce(10)  // recent signups
        .mockResolvedValueOnce(50); // recent logins
      mockPrismaCourse.count
        .mockResolvedValueOnce(15)  // total courses
        .mockResolvedValueOnce(12); // enabled courses
      mockPrismaEnrollment.count
        .mockResolvedValueOnce(200)  // total enrollments
        .mockResolvedValueOnce(150); // active enrollments
      mockPrismaAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'LOGIN', entity: 'USER', createdAt: new Date() },
      ]);

      const response = await getStats();
      const body = await response.json();

      // Check users stats
      expect(body.users).toBeDefined();
      expect(body.users.total).toBe(108);
      expect(body.users.byRole).toEqual({
        SUPER_ADMIN: 1,
        ADMIN: 2,
        INSTRUCTOR: 5,
        STUDENT: 100,
      });
      expect(body.users.active).toBe(105);
      expect(body.users.recentSignups).toBe(10);
      expect(body.users.recentLogins).toBe(50);

      // Check courses stats
      expect(body.courses).toBeDefined();
      expect(body.courses.total).toBe(15);
      expect(body.courses.enabled).toBe(12);

      // Check enrollments stats
      expect(body.enrollments).toBeDefined();
      expect(body.enrollments.total).toBe(200);
      expect(body.enrollments.active).toBe(150);

      // Check recent activity
      expect(body.recentActivity).toBeDefined();
      expect(Array.isArray(body.recentActivity)).toBe(true);
    });

    it('should handle zero stats gracefully', async () => {
      mockPrismaUser.groupBy.mockResolvedValue([]);
      mockPrismaUser.count.mockResolvedValue(0);
      mockPrismaCourse.count.mockResolvedValue(0);
      mockPrismaEnrollment.count.mockResolvedValue(0);
      mockPrismaAuditLog.findMany.mockResolvedValue([]);

      const response = await getStats();
      const body = await response.json();

      expect(body.users.total).toBe(0);
      expect(body.users.byRole).toEqual({
        SUPER_ADMIN: 0,
        ADMIN: 0,
        INSTRUCTOR: 0,
        STUDENT: 0,
      });
      expect(body.courses.total).toBe(0);
      expect(body.enrollments.total).toBe(0);
    });

    it('should calculate suspended users correctly', async () => {
      mockPrismaUser.groupBy.mockResolvedValue([
        { role: 'STUDENT', _count: { id: 100 } },
      ]);
      mockPrismaUser.count
        .mockResolvedValueOnce(95)  // active (5 suspended)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaCourse.count.mockResolvedValue(0);
      mockPrismaEnrollment.count.mockResolvedValue(0);
      mockPrismaAuditLog.findMany.mockResolvedValue([]);

      const response = await getStats();
      const body = await response.json();

      expect(body.users.suspended).toBe(5); // 100 total - 95 active = 5 suspended
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaUser.groupBy.mockRejectedValue(new Error('Database connection failed'));

      const response = await getStats();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('error occurred');
    });
  });
});

// Test Admin Users endpoint
import { GET as getUsers, POST as createUser } from '@/app/api/admin/users/route';

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await getUsers(new NextRequest('http://localhost:3000/api/admin/users'));

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'INSTRUCTOR' },
      });
      mockHasPermission.mockReturnValue(false);

      const response = await getUsers(new NextRequest('http://localhost:3000/api/admin/users'));

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);
    });

    it('should return list of users', async () => {
      mockPrismaUser.findMany.mockResolvedValue([
        { id: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'STUDENT' },
        { id: 'user-2', email: 'user2@test.com', name: 'User 2', role: 'INSTRUCTOR' },
      ]);
      mockPrismaUser.count.mockResolvedValue(2);

      const response = await getUsers(new NextRequest('http://localhost:3000/api/admin/users'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toHaveLength(2);
    });

    it('should filter by role', async () => {
      mockPrismaUser.findMany.mockResolvedValue([
        { id: 'instructor-1', email: 'instructor@test.com', name: 'Instructor', role: 'INSTRUCTOR' },
      ]);
      mockPrismaUser.count.mockResolvedValue(1);

      const response = await getUsers(new NextRequest('http://localhost:3000/api/admin/users?role=INSTRUCTOR'));

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'INSTRUCTOR',
          }),
        })
      );
    });

    it('should support search by name or email', async () => {
      mockPrismaUser.findMany.mockResolvedValue([]);
      mockPrismaUser.count.mockResolvedValue(0);

      await getUsers(new NextRequest('http://localhost:3000/api/admin/users?search=john'));

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
              expect.objectContaining({ email: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaUser.findMany.mockResolvedValue([]);
      mockPrismaUser.count.mockResolvedValue(50);

      await getUsers(new NextRequest('http://localhost:3000/api/admin/users?page=2&limit=10'));

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,  // (page 2 - 1) * limit 10
          take: 10,
        })
      );
    });
  });
});

describe('POST /api/admin/users', () => {
  // Note: Admin users endpoint requires password with uppercase, lowercase, and number
  const validUserData = {
    email: 'newuser@test.com',
    name: 'New User',
    role: 'INSTRUCTOR',
    password: 'SecurePass123', // Required by the API
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createUser(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'INSTRUCTOR' },
      });
      mockHasPermission.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createUser(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);
    });

    it('should reject invalid email', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...validUserData, email: 'not-an-email' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createUser(request);
      expect(response.status).toBe(400);
    });

    it('should reject invalid role', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...validUserData, role: 'INVALID_ROLE' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createUser(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);
      mockCanAssignRole.mockReturnValue(true);
      mockPrismaUser.findUnique.mockResolvedValue(null); // No existing user
      mockPrismaUser.create.mockResolvedValue({
        id: 'new-user-id',
        email: validUserData.email,
        name: validUserData.name,
        role: validUserData.role,
        isActive: true,
        createdAt: new Date(),
      });
      mockPrismaAuditLog.create.mockResolvedValue({});
    });

    it('should create user with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createUser(request);
      expect(response.status).toBe(201);
    });

    it('should create audit log on user creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData),
        headers: { 'Content-Type': 'application/json' },
      });

      await createUser(request);

      expect(mockPrismaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE_USER',
            entity: 'USER',
          }),
        })
      );
    });
  });

  describe('Duplicate Prevention', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockHasPermission.mockReturnValue(true);
      mockCanAssignRole.mockReturnValue(true);
    });

    it('should reject duplicate email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: validUserData.email,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createUser(request);
      expect(response.status).toBe(409);

      const body = await response.json();
      expect(body.error).toContain('already exists');
    });
  });
});
