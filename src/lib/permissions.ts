import type { Role } from '@prisma/client';

// Permission definitions
export type Permission =
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:assign_roles'
  | 'courses:view_all'
  | 'courses:view_assigned'
  | 'courses:enable_disable'
  | 'courses:assign_instructors'
  | 'content:view'
  | 'content:edit_notes'
  | 'content:download_all'
  | 'content:download_student'
  | 'progress:view_own'
  | 'progress:view_all'
  | 'progress:mark_own'
  | 'progress:mark_others'
  | 'admin:access'
  | 'admin:analytics'
  | 'admin:settings';

// Role-to-permissions mapping
const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'users:assign_roles',
    'courses:view_all',
    'courses:view_assigned',
    'courses:enable_disable',
    'courses:assign_instructors',
    'content:view',
    'content:edit_notes',
    'content:download_all',
    'content:download_student',
    'progress:view_own',
    'progress:view_all',
    'progress:mark_own',
    'progress:mark_others',
    'admin:access',
    'admin:analytics',
    'admin:settings',
  ],
  ADMIN: [
    'users:view',
    'users:create',
    'users:edit',
    'users:assign_roles',
    'courses:view_all',
    'courses:view_assigned',
    'courses:enable_disable',
    'courses:assign_instructors',
    'content:view',
    'content:edit_notes',
    'content:download_all',
    'content:download_student',
    'progress:view_own',
    'progress:view_all',
    'progress:mark_own',
    'progress:mark_others',
    'admin:access',
    'admin:analytics',
    'admin:settings',
  ],
  INSTRUCTOR: [
    'courses:view_assigned',
    'content:view',
    'content:edit_notes',
    'content:download_all',
    'content:download_student',
    'progress:view_own',
    'progress:mark_own',
    // Note: Instructors can view/mark progress for their assigned courses only
    // This is enforced at the data level, not permission level
  ],
  STUDENT: [
    'courses:view_assigned',
    'content:view',
    'content:download_student',
    'progress:view_own',
    'progress:mark_own',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Role display names
 */
export const roleDisplayNames: Record<Role, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
};

/**
 * Role descriptions
 */
export const roleDescriptions: Record<Role, string> = {
  SUPER_ADMIN: 'Full system access including user deletion and system settings',
  ADMIN: 'User management, course assignments, and organization settings',
  INSTRUCTOR: 'Full access to assigned courses and student progress tracking',
  STUDENT: 'Read-only access to enrolled courses with personal progress tracking',
};

/**
 * Roles that can be assigned by each role
 */
export const assignableRoles: Record<Role, Role[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'],
  ADMIN: ['ADMIN', 'INSTRUCTOR', 'STUDENT'],
  INSTRUCTOR: [],
  STUDENT: [],
};

/**
 * Check if a role can assign another role
 */
export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  return assignableRoles[assignerRole]?.includes(targetRole) ?? false;
}
