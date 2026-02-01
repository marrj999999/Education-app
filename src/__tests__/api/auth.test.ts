/**
 * API Tests: Authentication
 * Tests for /api/auth/register endpoint
 */

import { NextRequest } from 'next/server';

// Mock bcrypt before importing the route handler
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

// Mock Prisma
const mockPrismaUser = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: {
    user: mockPrismaUser,
    auditLog: mockPrismaAuditLog,
  },
}));

// Import the route handler after mocking
import { POST } from '@/app/api/auth/register/route';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: user doesn't exist
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockPrismaUser.create.mockResolvedValue({
      id: 'new-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STUDENT',
      createdAt: new Date(),
    });
    mockPrismaAuditLog.create.mockResolvedValue({});
  });

  describe('Validation', () => {
    it('should reject missing email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ password: 'SecurePass123!' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      // Zod returns 'Required' for missing fields
    });

    it('should reject invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('email');
    });

    it('should reject password without uppercase', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('uppercase');
    });

    it('should reject password without lowercase', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'PASSWORD123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('lowercase');
    });

    it('should reject password without number', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('number');
    });

    it('should reject password without special character', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('special character');
    });

    it('should reject password under 8 characters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Pa1!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('8 characters');
    });

    it('should reject password over 128 characters', async () => {
      // Password must be > 128 chars to trigger max validation
      // Build a password that satisfies uppercase, lowercase, number, special char, AND is > 128 chars
      const longPassword = 'Aa1!' + 'x'.repeat(125); // 129 characters total
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: longPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('128');
    });
  });

  describe('Success Cases', () => {
    it('should create user with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.message).toContain('successfully');
      expect(mockPrismaUser.create).toHaveBeenCalled();
    });

    it('should create user without optional name', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('should lowercase email before creating user', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'TEST@EXAMPLE.COM',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockPrismaUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should create audit log on successful registration', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockPrismaAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'REGISTER',
            entity: 'USER',
          }),
        })
      );
    });
  });

  describe('Security', () => {
    it('should return generic error if email exists (prevents enumeration)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      // Should NOT reveal that the email exists
      expect(body.error).not.toContain('already exists');
      expect(body.error).not.toContain('registered');
      expect(body.error).toContain('Unable to create account');
    });

    it('should not expose user details in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      // Should not include user ID, email, or other details
      expect(body.id).toBeUndefined();
      expect(body.email).toBeUndefined();
      expect(body.user).toBeUndefined();
    });

    it('should assign STUDENT role by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockPrismaUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'STUDENT',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrismaUser.create.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toContain('error occurred');
    });
  });
});
