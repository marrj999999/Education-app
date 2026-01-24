import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { Role } from '@prisma/client';

// Extend the session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
    };
  }

  interface User {
    role: Role;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // @ts-expect-error - PrismaAdapter type mismatch due to @auth/core version differences
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host header for local development
  session: {
    strategy: 'jwt', // Use JWT for Edge compatibility
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  providers: [
    // Email/Password authentication
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[AUTH] authorize called with:', {
          hasEmail: !!credentials?.email,
          hasPassword: !!credentials?.password,
          email: credentials?.email
        });

        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing email or password');
          throw new Error('Email and password are required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        console.log('[AUTH] Looking for user:', email.toLowerCase());

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        console.log('[AUTH] User found:', !!user, user?.email);

        if (!user) {
          console.log('[AUTH] User not found');
          throw new Error('Invalid email or password');
        }

        if (!user.password) {
          console.log('[AUTH] User has no password');
          throw new Error('Please sign in with your social account');
        }

        if (!user.isActive) {
          console.log('[AUTH] User not active');
          throw new Error('Your account has been suspended');
        }

        // Verify password
        console.log('[AUTH] Comparing passwords...');
        console.log('[AUTH] Password length:', password.length);
        console.log('[AUTH] Password chars:', JSON.stringify(password));
        console.log('[AUTH] Hash:', user.password.substring(0, 30) + '...');
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('[AUTH] Password valid:', isValidPassword);

        if (!isValidPassword) {
          console.log('[AUTH] Password mismatch');
          throw new Error('Invalid email or password');
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),

    // Google OAuth (optional - configure in .env)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // SECURITY: Disabled to prevent account takeover via OAuth
            // If an attacker gains access to a user's Google account, they could
            // link it to an existing account and take over that account
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle session updates (e.g., role change)
      if (trigger === 'update' && session?.role) {
        token.role = session.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },

    async signIn({ user, account }) {
      // For OAuth providers, check if user is active
      if (account?.provider !== 'credentials') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (existingUser && !existingUser.isActive) {
          return false; // Block suspended users
        }

        // Update last login for OAuth users
        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastLoginAt: new Date() },
          });
        }
      }

      return true;
    },
  },
  events: {
    async signIn({ user }) {
      // Log successful sign in
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'USER',
          entityId: user.id,
        },
      });
    },

    async signOut(message) {
      // Log sign out - handle both session and JWT strategies
      const token = 'token' in message ? message.token : null;
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: 'LOGOUT',
            entity: 'USER',
            entityId: token.id as string,
          },
        });
      }
    },
  },
});

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
