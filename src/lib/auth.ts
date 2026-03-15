import { createServerSupabaseClient } from './supabase/server';
import { prisma } from './db';
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
 * Uses Supabase for authentication and Prisma User table for role/authorization.
 * Returns null if not authenticated or user not found/inactive.
 */
export async function auth(): Promise<AuthSession | null> {
  // If Supabase isn't configured, return null (blocks all authenticated routes)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) return null;

    // Look up the Prisma User for role and app-level data
    const prismaUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
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
