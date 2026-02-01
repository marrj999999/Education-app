import { z } from "zod";
import { NextRequest } from "next/server";
import { Errors } from "../errors";

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw Errors.validation("Invalid request body", {
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    throw Errors.validation("Invalid JSON in request body");
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): T {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    return schema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw Errors.validation("Invalid query parameters", {
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    throw error;
  }
}

// ============================================
// Common Validation Schemas
// ============================================

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const dateSchema = z.string().datetime("Invalid date format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// Cohort Schemas
// ============================================

export const createCohortSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  courseId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  maxLearners: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateCohortSchema = createCohortSchema.partial();

// ============================================
// Learner Schemas
// ============================================

export const createLearnerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateLearnerSchema = createLearnerSchema.partial();

// ============================================
// Session Schemas
// ============================================

export const createSessionSchema = z.object({
  lessonId: uuidSchema,
  scheduledDate: dateSchema,
  instructorId: uuidSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  completedAt: dateSchema.optional(),
  instructorNotes: z.string().max(2000).optional(),
});

// ============================================
// Attendance Schemas
// ============================================

export const recordAttendanceSchema = z.object({
  learnerId: uuidSchema,
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  notes: z.string().max(500).optional(),
});

export const bulkAttendanceSchema = z.object({
  attendances: z.array(recordAttendanceSchema),
});

// ============================================
// Assessment Schemas
// ============================================

export const assessmentSignoffSchema = z.object({
  learnerId: uuidSchema,
  criteriaId: uuidSchema,
  status: z.enum(["NOT_ASSESSED", "IN_PROGRESS", "COMPETENT", "NOT_YET_COMPETENT"]),
  notes: z.string().max(1000).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
});

// ============================================
// IQA Schemas
// ============================================

export const createIqaSampleSchema = z.object({
  learnerId: uuidSchema,
  assessmentId: uuidSchema,
  sampledBy: uuidSchema,
  outcome: z.enum(["APPROVED", "NEEDS_REVISION", "REJECTED"]).optional(),
  feedback: z.string().max(2000).optional(),
});

// ============================================
// Upload Schemas
// ============================================

export const uploadMetadataSchema = z.object({
  cohortId: uuidSchema.optional(),
  learnerId: uuidSchema.optional(),
  assessmentId: uuidSchema.optional(),
  type: z.enum(["EVIDENCE", "DOCUMENT", "IMAGE"]).default("DOCUMENT"),
});

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(1, "Name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
