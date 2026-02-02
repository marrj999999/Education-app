/**
 * Tests for permission management system
 * Verifies role-based access control works correctly
 */

import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  canAssignRole,
  roleDisplayNames,
  roleDescriptions,
  assignableRoles,
  type Permission,
} from '@/lib/permissions';
import type { Role } from '@prisma/client';

describe('Permission System', () => {
  describe('hasPermission', () => {
    describe('SUPER_ADMIN role', () => {
      const role: Role = 'SUPER_ADMIN';

      it('should have all user management permissions', () => {
        expect(hasPermission(role, 'users:view')).toBe(true);
        expect(hasPermission(role, 'users:create')).toBe(true);
        expect(hasPermission(role, 'users:edit')).toBe(true);
        expect(hasPermission(role, 'users:delete')).toBe(true);
        expect(hasPermission(role, 'users:assign_roles')).toBe(true);
      });

      it('should have all course permissions', () => {
        expect(hasPermission(role, 'courses:view_all')).toBe(true);
        expect(hasPermission(role, 'courses:view_assigned')).toBe(true);
        expect(hasPermission(role, 'courses:enable_disable')).toBe(true);
        expect(hasPermission(role, 'courses:assign_instructors')).toBe(true);
      });

      it('should have all admin permissions', () => {
        expect(hasPermission(role, 'admin:access')).toBe(true);
        expect(hasPermission(role, 'admin:analytics')).toBe(true);
        expect(hasPermission(role, 'admin:settings')).toBe(true);
      });

      it('should have all content permissions', () => {
        expect(hasPermission(role, 'content:view')).toBe(true);
        expect(hasPermission(role, 'content:edit_notes')).toBe(true);
        expect(hasPermission(role, 'content:download_all')).toBe(true);
        expect(hasPermission(role, 'content:download_student')).toBe(true);
      });

      it('should have all progress permissions', () => {
        expect(hasPermission(role, 'progress:view_own')).toBe(true);
        expect(hasPermission(role, 'progress:view_all')).toBe(true);
        expect(hasPermission(role, 'progress:mark_own')).toBe(true);
        expect(hasPermission(role, 'progress:mark_others')).toBe(true);
      });
    });

    describe('ADMIN role', () => {
      const role: Role = 'ADMIN';

      it('should have user management permissions except delete', () => {
        expect(hasPermission(role, 'users:view')).toBe(true);
        expect(hasPermission(role, 'users:create')).toBe(true);
        expect(hasPermission(role, 'users:edit')).toBe(true);
        expect(hasPermission(role, 'users:delete')).toBe(false);
        expect(hasPermission(role, 'users:assign_roles')).toBe(true);
      });

      it('should have all course permissions', () => {
        expect(hasPermission(role, 'courses:view_all')).toBe(true);
        expect(hasPermission(role, 'courses:enable_disable')).toBe(true);
        expect(hasPermission(role, 'courses:assign_instructors')).toBe(true);
      });

      it('should have admin permissions', () => {
        expect(hasPermission(role, 'admin:access')).toBe(true);
        expect(hasPermission(role, 'admin:analytics')).toBe(true);
        expect(hasPermission(role, 'admin:settings')).toBe(true);
      });
    });

    describe('INSTRUCTOR role', () => {
      const role: Role = 'INSTRUCTOR';

      it('should NOT have user management permissions', () => {
        expect(hasPermission(role, 'users:view')).toBe(false);
        expect(hasPermission(role, 'users:create')).toBe(false);
        expect(hasPermission(role, 'users:edit')).toBe(false);
        expect(hasPermission(role, 'users:delete')).toBe(false);
        expect(hasPermission(role, 'users:assign_roles')).toBe(false);
      });

      it('should only view assigned courses', () => {
        expect(hasPermission(role, 'courses:view_all')).toBe(false);
        expect(hasPermission(role, 'courses:view_assigned')).toBe(true);
        expect(hasPermission(role, 'courses:enable_disable')).toBe(false);
        expect(hasPermission(role, 'courses:assign_instructors')).toBe(false);
      });

      it('should NOT have admin permissions', () => {
        expect(hasPermission(role, 'admin:access')).toBe(false);
        expect(hasPermission(role, 'admin:analytics')).toBe(false);
        expect(hasPermission(role, 'admin:settings')).toBe(false);
      });

      it('should have content permissions', () => {
        expect(hasPermission(role, 'content:view')).toBe(true);
        expect(hasPermission(role, 'content:edit_notes')).toBe(true);
        expect(hasPermission(role, 'content:download_all')).toBe(true);
        expect(hasPermission(role, 'content:download_student')).toBe(true);
      });

      it('should have limited progress permissions', () => {
        expect(hasPermission(role, 'progress:view_own')).toBe(true);
        expect(hasPermission(role, 'progress:view_all')).toBe(false);
        expect(hasPermission(role, 'progress:mark_own')).toBe(true);
        expect(hasPermission(role, 'progress:mark_others')).toBe(false);
      });
    });

    describe('STUDENT role', () => {
      const role: Role = 'STUDENT';

      it('should NOT have any user management permissions', () => {
        expect(hasPermission(role, 'users:view')).toBe(false);
        expect(hasPermission(role, 'users:create')).toBe(false);
        expect(hasPermission(role, 'users:edit')).toBe(false);
        expect(hasPermission(role, 'users:delete')).toBe(false);
      });

      it('should only view assigned courses', () => {
        expect(hasPermission(role, 'courses:view_all')).toBe(false);
        expect(hasPermission(role, 'courses:view_assigned')).toBe(true);
        expect(hasPermission(role, 'courses:enable_disable')).toBe(false);
      });

      it('should NOT have admin permissions', () => {
        expect(hasPermission(role, 'admin:access')).toBe(false);
        expect(hasPermission(role, 'admin:analytics')).toBe(false);
        expect(hasPermission(role, 'admin:settings')).toBe(false);
      });

      it('should have limited content permissions', () => {
        expect(hasPermission(role, 'content:view')).toBe(true);
        expect(hasPermission(role, 'content:edit_notes')).toBe(false);
        expect(hasPermission(role, 'content:download_all')).toBe(false);
        expect(hasPermission(role, 'content:download_student')).toBe(true);
      });

      it('should only manage own progress', () => {
        expect(hasPermission(role, 'progress:view_own')).toBe(true);
        expect(hasPermission(role, 'progress:view_all')).toBe(false);
        expect(hasPermission(role, 'progress:mark_own')).toBe(true);
        expect(hasPermission(role, 'progress:mark_others')).toBe(false);
      });
    });

    it('should return false for invalid role', () => {
      // @ts-expect-error - Testing invalid role
      expect(hasPermission('INVALID_ROLE', 'users:view')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when role has all specified permissions', () => {
      const adminPermissions: Permission[] = ['users:view', 'users:create', 'users:edit'];
      expect(hasAllPermissions('SUPER_ADMIN', adminPermissions)).toBe(true);
      expect(hasAllPermissions('ADMIN', adminPermissions)).toBe(true);
    });

    it('should return false when role is missing any permission', () => {
      const adminPermissions: Permission[] = ['users:view', 'users:delete'];
      expect(hasAllPermissions('ADMIN', adminPermissions)).toBe(false);
    });

    it('should return true for empty permission array', () => {
      expect(hasAllPermissions('STUDENT', [])).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when role has at least one permission', () => {
      const permissions: Permission[] = ['users:delete', 'content:view'];
      expect(hasAnyPermission('STUDENT', permissions)).toBe(true);
    });

    it('should return false when role has none of the permissions', () => {
      const adminOnlyPermissions: Permission[] = ['users:delete', 'admin:settings'];
      expect(hasAnyPermission('STUDENT', adminOnlyPermissions)).toBe(false);
    });

    it('should return false for empty permission array', () => {
      expect(hasAnyPermission('SUPER_ADMIN', [])).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for SUPER_ADMIN', () => {
      const permissions = getPermissions('SUPER_ADMIN');
      expect(permissions).toContain('users:delete');
      expect(permissions).toContain('admin:settings');
      expect(permissions.length).toBeGreaterThan(15);
    });

    it('should return fewer permissions for STUDENT', () => {
      const studentPerms = getPermissions('STUDENT');
      const adminPerms = getPermissions('SUPER_ADMIN');
      expect(studentPerms.length).toBeLessThan(adminPerms.length);
    });

    it('should return empty array for invalid role', () => {
      // @ts-expect-error - Testing invalid role
      expect(getPermissions('INVALID_ROLE')).toEqual([]);
    });
  });

  describe('canAssignRole', () => {
    describe('SUPER_ADMIN assigner', () => {
      it('should be able to assign any role', () => {
        expect(canAssignRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
        expect(canAssignRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
        expect(canAssignRole('SUPER_ADMIN', 'INSTRUCTOR')).toBe(true);
        expect(canAssignRole('SUPER_ADMIN', 'STUDENT')).toBe(true);
      });
    });

    describe('ADMIN assigner', () => {
      it('should be able to assign ADMIN, INSTRUCTOR, and STUDENT', () => {
        expect(canAssignRole('ADMIN', 'ADMIN')).toBe(true);
        expect(canAssignRole('ADMIN', 'INSTRUCTOR')).toBe(true);
        expect(canAssignRole('ADMIN', 'STUDENT')).toBe(true);
      });

      it('should NOT be able to assign SUPER_ADMIN', () => {
        expect(canAssignRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
      });
    });

    describe('INSTRUCTOR assigner', () => {
      it('should NOT be able to assign any roles', () => {
        expect(canAssignRole('INSTRUCTOR', 'SUPER_ADMIN')).toBe(false);
        expect(canAssignRole('INSTRUCTOR', 'ADMIN')).toBe(false);
        expect(canAssignRole('INSTRUCTOR', 'INSTRUCTOR')).toBe(false);
        expect(canAssignRole('INSTRUCTOR', 'STUDENT')).toBe(false);
      });
    });

    describe('STUDENT assigner', () => {
      it('should NOT be able to assign any roles', () => {
        expect(canAssignRole('STUDENT', 'SUPER_ADMIN')).toBe(false);
        expect(canAssignRole('STUDENT', 'ADMIN')).toBe(false);
        expect(canAssignRole('STUDENT', 'INSTRUCTOR')).toBe(false);
        expect(canAssignRole('STUDENT', 'STUDENT')).toBe(false);
      });
    });

    it('should return false for invalid assigner role', () => {
      // @ts-expect-error - Testing invalid role
      expect(canAssignRole('INVALID_ROLE', 'STUDENT')).toBe(false);
    });
  });

  describe('Role metadata', () => {
    it('should have display names for all roles', () => {
      expect(roleDisplayNames.SUPER_ADMIN).toBe('Super Administrator');
      expect(roleDisplayNames.ADMIN).toBe('Administrator');
      expect(roleDisplayNames.INSTRUCTOR).toBe('Instructor');
      expect(roleDisplayNames.STUDENT).toBe('Student');
    });

    it('should have descriptions for all roles', () => {
      expect(roleDescriptions.SUPER_ADMIN).toContain('Full system access');
      expect(roleDescriptions.ADMIN).toContain('User management');
      expect(roleDescriptions.INSTRUCTOR).toContain('assigned courses');
      expect(roleDescriptions.STUDENT).toContain('Read-only');
    });

    it('should have assignable roles defined for all roles', () => {
      expect(assignableRoles.SUPER_ADMIN).toHaveLength(4);
      expect(assignableRoles.ADMIN).toHaveLength(3);
      expect(assignableRoles.INSTRUCTOR).toHaveLength(0);
      expect(assignableRoles.STUDENT).toHaveLength(0);
    });
  });

  describe('Permission hierarchy validation', () => {
    it('should ensure SUPER_ADMIN has more permissions than ADMIN', () => {
      const superAdminPerms = getPermissions('SUPER_ADMIN');
      const adminPerms = getPermissions('ADMIN');

      // SUPER_ADMIN should have everything ADMIN has plus users:delete
      expect(superAdminPerms).toContain('users:delete');
      expect(adminPerms).not.toContain('users:delete');

      // All admin permissions should be in super admin
      adminPerms.forEach((perm) => {
        expect(superAdminPerms).toContain(perm);
      });
    });

    it('should ensure ADMIN has more permissions than INSTRUCTOR', () => {
      const adminPerms = getPermissions('ADMIN');
      const instructorPerms = getPermissions('INSTRUCTOR');

      expect(adminPerms.length).toBeGreaterThan(instructorPerms.length);
      expect(adminPerms).toContain('admin:access');
      expect(instructorPerms).not.toContain('admin:access');
    });

    it('should ensure INSTRUCTOR has more permissions than STUDENT', () => {
      const instructorPerms = getPermissions('INSTRUCTOR');
      const studentPerms = getPermissions('STUDENT');

      expect(instructorPerms.length).toBeGreaterThan(studentPerms.length);
      expect(instructorPerms).toContain('content:edit_notes');
      expect(studentPerms).not.toContain('content:edit_notes');
    });
  });
});
