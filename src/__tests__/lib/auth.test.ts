/**
 * Tests for authentication utilities
 * Verifies role checking, hierarchy, and session management
 */

import { hasRole, hasMinimumRole, ROLE_HIERARCHY } from '@/lib/auth';
import type { Role } from '@prisma/client';

// Mock Supabase + Prisma so we can test auth() in isolation
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Auth Utilities', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should define all four roles', () => {
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBeDefined();
      expect(ROLE_HIERARCHY.ADMIN).toBeDefined();
      expect(ROLE_HIERARCHY.INSTRUCTOR).toBeDefined();
      expect(ROLE_HIERARCHY.STUDENT).toBeDefined();
    });

    it('should have SUPER_ADMIN as highest rank', () => {
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBeGreaterThan(ROLE_HIERARCHY.ADMIN);
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBeGreaterThan(ROLE_HIERARCHY.INSTRUCTOR);
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBeGreaterThan(ROLE_HIERARCHY.STUDENT);
    });

    it('should have STUDENT as lowest rank', () => {
      expect(ROLE_HIERARCHY.STUDENT).toBeLessThan(ROLE_HIERARCHY.INSTRUCTOR);
      expect(ROLE_HIERARCHY.STUDENT).toBeLessThan(ROLE_HIERARCHY.ADMIN);
      expect(ROLE_HIERARCHY.STUDENT).toBeLessThan(ROLE_HIERARCHY.SUPER_ADMIN);
    });

    it('should have strictly ascending hierarchy', () => {
      expect(ROLE_HIERARCHY.STUDENT).toBeLessThan(ROLE_HIERARCHY.INSTRUCTOR);
      expect(ROLE_HIERARCHY.INSTRUCTOR).toBeLessThan(ROLE_HIERARCHY.ADMIN);
      expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.SUPER_ADMIN);
    });
  });

  describe('hasRole', () => {
    it('should return true when role is in the required list', () => {
      expect(hasRole('ADMIN', ['ADMIN', 'SUPER_ADMIN'])).toBe(true);
    });

    it('should return false when role is not in the required list', () => {
      expect(hasRole('STUDENT', ['ADMIN', 'SUPER_ADMIN'])).toBe(false);
    });

    it('should return true for exact single-role match', () => {
      expect(hasRole('INSTRUCTOR', ['INSTRUCTOR'])).toBe(true);
    });

    it('should return false for empty required roles array', () => {
      expect(hasRole('SUPER_ADMIN', [])).toBe(false);
    });

    it('should return true when all roles are in the list', () => {
      const allRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'];
      expect(hasRole('STUDENT', allRoles)).toBe(true);
    });
  });

  describe('hasMinimumRole', () => {
    it('should return true when user has exact required role', () => {
      expect(hasMinimumRole('ADMIN', 'ADMIN')).toBe(true);
    });

    it('should return true when user has higher role than required', () => {
      expect(hasMinimumRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(hasMinimumRole('ADMIN', 'INSTRUCTOR')).toBe(true);
      expect(hasMinimumRole('INSTRUCTOR', 'STUDENT')).toBe(true);
    });

    it('should return false when user has lower role than required', () => {
      expect(hasMinimumRole('STUDENT', 'INSTRUCTOR')).toBe(false);
      expect(hasMinimumRole('INSTRUCTOR', 'ADMIN')).toBe(false);
      expect(hasMinimumRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
    });

    it('should allow SUPER_ADMIN to pass any minimum role check', () => {
      expect(hasMinimumRole('SUPER_ADMIN', 'STUDENT')).toBe(true);
      expect(hasMinimumRole('SUPER_ADMIN', 'INSTRUCTOR')).toBe(true);
      expect(hasMinimumRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(hasMinimumRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
    });

    it('should only allow STUDENT to pass STUDENT minimum', () => {
      expect(hasMinimumRole('STUDENT', 'STUDENT')).toBe(true);
      expect(hasMinimumRole('STUDENT', 'INSTRUCTOR')).toBe(false);
      expect(hasMinimumRole('STUDENT', 'ADMIN')).toBe(false);
      expect(hasMinimumRole('STUDENT', 'SUPER_ADMIN')).toBe(false);
    });
  });

  describe('auth() function', () => {
    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    const { prisma } = require('@/lib/db');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return null when Supabase env vars are missing', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Re-import to pick up the env change
      const { auth } = require('@/lib/auth');
      const session = await auth();
      expect(session).toBeNull();

      // Restore
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    });

    it('should return null when Supabase user has no email', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'supabase-id' } }, // no email
          }),
        },
      });

      const { auth } = require('@/lib/auth');
      const session = await auth();
      expect(session).toBeNull();
    });

    it('should return null when Prisma user is not found', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'supabase-id', email: 'user@test.com' } },
          }),
        },
      });

      prisma.user.findUnique.mockResolvedValue(null);

      const { auth } = require('@/lib/auth');
      const session = await auth();
      expect(session).toBeNull();
    });

    it('should return null when Prisma user is inactive', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'supabase-id', email: 'user@test.com' } },
          }),
        },
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 'prisma-id',
        email: 'user@test.com',
        name: 'Test User',
        image: null,
        role: 'INSTRUCTOR',
        isActive: false,
      });

      const { auth } = require('@/lib/auth');
      const session = await auth();
      expect(session).toBeNull();
    });

    it('should return session with user data when authenticated', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      createServerSupabaseClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'supabase-id', email: 'Admin@Test.com' } },
          }),
        },
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 'prisma-id',
        email: 'admin@test.com',
        name: 'Admin User',
        image: '/avatar.png',
        role: 'ADMIN',
        isActive: true,
      });

      const { auth } = require('@/lib/auth');
      const session = await auth();

      expect(session).toEqual({
        user: {
          id: 'prisma-id',
          email: 'admin@test.com',
          name: 'Admin User',
          image: '/avatar.png',
          role: 'ADMIN',
        },
      });

      // Verify email was normalized to lowercase
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
      });
    });

    it('should return null when Supabase throws an error', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      createServerSupabaseClient.mockRejectedValue(new Error('Network error'));

      const { auth } = require('@/lib/auth');
      const session = await auth();
      expect(session).toBeNull();
    });
  });
});
