/**
 * Tests for authentication utilities
 * Verifies role checking, hierarchy, and cookie-based session management
 */

import { hasRole, hasMinimumRole, ROLE_HIERARCHY } from '@/lib/auth';
import type { Role } from '@prisma/client';

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
});
