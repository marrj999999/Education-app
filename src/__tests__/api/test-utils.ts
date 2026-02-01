/**
 * Test utilities for API route testing
 * Provides mocking and helper functions for Next.js API routes
 */

import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';

// Mock user sessions for different roles
export const mockUsers = {
  superAdmin: {
    id: 'super-admin-id',
    email: 'superadmin@test.com',
    name: 'Super Admin',
    role: 'SUPER_ADMIN' as Role,
    image: null,
  },
  admin: {
    id: 'admin-id',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'ADMIN' as Role,
    image: null,
  },
  instructor: {
    id: 'instructor-id',
    email: 'instructor@test.com',
    name: 'Instructor User',
    role: 'INSTRUCTOR' as Role,
    image: null,
  },
  student: {
    id: 'student-id',
    email: 'student@test.com',
    name: 'Student User',
    role: 'STUDENT' as Role,
    image: null,
  },
};

// Mock session factory
export function createMockSession(user: typeof mockUsers[keyof typeof mockUsers] | null) {
  if (!user) return null;
  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Create a mock NextRequest for testing
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, searchParams } = options;

  const urlObj = new URL(url, 'http://localhost:3000');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
  }

  const request = new NextRequest(urlObj.toString(), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });

  return request;
}

// Helper to parse JSON response
export async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

// Common test data factories
export const testData = {
  validUUID: '550e8400-e29b-41d4-a716-446655440000',
  validEmail: 'test@example.com',
  validPassword: 'SecurePass123!',
  invalidUUID: 'not-a-uuid',
  invalidEmail: 'not-an-email',

  // Create a valid cohort input
  cohort: {
    name: 'Test Cohort',
    code: 'TEST-2024',
    courseId: '550e8400-e29b-41d4-a716-446655440000',
    startDate: '2024-03-01T09:00:00.000Z',
    endDate: '2024-06-01T17:00:00.000Z',
    maxLearners: 12,
    instructorIds: ['instructor-id'],
  },

  // Create a valid learner input
  learner: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+44 7700 900000',
  },

  // Create a valid session input
  session: {
    lessonId: '550e8400-e29b-41d4-a716-446655440000',
    scheduledDate: '2024-03-15T09:00:00.000Z',
  },
};

// Mock Prisma client with common methods
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    learner: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    curriculumCourse: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    assessment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    iqaSample: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      cohort: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    })),
  };
}

// Type for the mock Prisma client
export type MockPrismaClient = ReturnType<typeof createMockPrismaClient>;
