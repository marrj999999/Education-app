import { prisma } from './db';
import { getSessionFromCookies } from './auth-cookie';
import type { Role } from '@prisma/client';

// Session type matching the interface used throughout the app
export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: Role;
  };
}

/**
 * Get the current authenticated session.
 * Reads the signed session cookie and looks up the user in Prisma
 * for a fresh isActive check.
 * Returns null if not authenticated or user not found/inactive.
 */
export async function auth(): Promise<AuthSession | null> {
  try {
    const session = await getSessionFromCookies();
    if (!session) return null;

    // Look up the Prisma user for fresh data (isActive could change)
    const prismaUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
      },
    });

    if (!prismaUser || !prismaUser.isActive) return null;

    return {
      user: {
        id: prismaUser.id,
        email: prismaUser.email,
        name: prismaUser.name,
        image: prismaUser.image,
        role: prismaUser.role,
      },
    };
  } catch {
    return null;
  }
}

// Helper to check if user has required role
export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole);
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  INSTRUCTOR: 2,
  STUDENT: 1,
};

// Check if user has at least the required role level
export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
