import {
  createCohortSchema,
  updateCohortSchema,
  createLearnerSchema,
  updateLearnerSchema,
  createSessionSchema,
  updateSessionSchema,
  recordAttendanceSchema,
  assessmentSignoffSchema,
  loginSchema,
  registerSchema,
  uuidSchema,
  dateSchema,
  paginationSchema,
} from "@/lib/validations";

describe("Common Validations", () => {
  describe("uuidSchema", () => {
    it("should validate a valid UUID", () => {
      const result = uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000");
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = uuidSchema.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
    });
  });

  describe("dateSchema", () => {
    it("should validate ISO datetime string", () => {
      const result = dateSchema.safeParse("2024-03-01T10:00:00.000Z");
      expect(result.success).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = dateSchema.safeParse("2024-03-01");
      expect(result.success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("should parse valid pagination", () => {
      const result = paginationSchema.safeParse({ page: "2", limit: "50" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it("should use defaults when empty", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should reject limit over 100", () => {
      const result = paginationSchema.safeParse({ page: "1", limit: "200" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Cohort Validations", () => {
  describe("createCohortSchema", () => {
    it("should validate valid cohort creation data", () => {
      const createData = {
        name: "Spring 2024 Cohort",
        courseId: "550e8400-e29b-41d4-a716-446655440000",
        startDate: "2024-03-01T09:00:00.000Z",
        endDate: "2024-06-01T17:00:00.000Z",
        maxLearners: 12,
      };

      const result = createCohortSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const createData = {
        name: "",
        courseId: "550e8400-e29b-41d4-a716-446655440000",
        startDate: "2024-03-01T09:00:00.000Z",
      };

      const result = createCohortSchema.safeParse(createData);
      expect(result.success).toBe(false);
    });

    it("should require name, courseId, and startDate", () => {
      const result = createCohortSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should allow optional endDate", () => {
      const createData = {
        name: "Open Cohort",
        courseId: "550e8400-e29b-41d4-a716-446655440000",
        startDate: "2024-03-01T09:00:00.000Z",
      };

      const result = createCohortSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });
  });

  describe("updateCohortSchema", () => {
    it("should allow partial updates", () => {
      const result = updateCohortSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(true);
    });

    it("should allow empty object", () => {
      const result = updateCohortSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe("Learner Validations", () => {
  describe("createLearnerSchema", () => {
    it("should validate valid learner creation", () => {
      const createData = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "+44 7700 900000",
      };

      const result = createLearnerSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should require firstName and lastName", () => {
      const result = createLearnerSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject empty firstName", () => {
      const createData = {
        firstName: "",
        lastName: "Smith",
      };

      const result = createLearnerSchema.safeParse(createData);
      expect(result.success).toBe(false);
    });

    it("should allow optional email and phone", () => {
      const createData = {
        firstName: "John",
        lastName: "Doe",
      };

      const result = createLearnerSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const createData = {
        firstName: "John",
        lastName: "Doe",
        email: "not-an-email",
      };

      const result = createLearnerSchema.safeParse(createData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateLearnerSchema", () => {
    it("should allow partial updates", () => {
      const result = updateLearnerSchema.safeParse({ firstName: "Updated" });
      expect(result.success).toBe(true);
    });
  });
});

describe("Session Validations", () => {
  describe("createSessionSchema", () => {
    it("should validate valid session creation", () => {
      const validSession = {
        lessonId: "550e8400-e29b-41d4-a716-446655440000",
        scheduledDate: "2024-03-15T09:00:00.000Z",
      };

      const result = createSessionSchema.safeParse(validSession);
      expect(result.success).toBe(true);
    });

    it("should require lessonId and scheduledDate", () => {
      const result = createSessionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateSessionSchema", () => {
    it("should validate valid status update", () => {
      const updateData = {
        status: "COMPLETED",
        completedAt: "2024-03-15T17:00:00.000Z",
      };

      const result = updateSessionSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = updateSessionSchema.safeParse({ status: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("should accept valid status values", () => {
      const statuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

      for (const status of statuses) {
        const result = updateSessionSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe("Attendance Validations", () => {
  describe("recordAttendanceSchema", () => {
    it("should validate valid attendance record", () => {
      const attendance = {
        learnerId: "550e8400-e29b-41d4-a716-446655440000",
        status: "PRESENT",
      };

      const result = recordAttendanceSchema.safeParse(attendance);
      expect(result.success).toBe(true);
    });

    it("should accept valid attendance statuses", () => {
      const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

      for (const status of statuses) {
        const result = recordAttendanceSchema.safeParse({
          learnerId: "550e8400-e29b-41d4-a716-446655440000",
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const result = recordAttendanceSchema.safeParse({
        learnerId: "550e8400-e29b-41d4-a716-446655440000",
        status: "UNKNOWN",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Assessment Validations", () => {
  describe("assessmentSignoffSchema", () => {
    it("should validate valid assessment signoff", () => {
      const signoff = {
        learnerId: "550e8400-e29b-41d4-a716-446655440000",
        criteriaId: "660e8400-e29b-41d4-a716-446655440000",
        status: "COMPETENT",
      };

      const result = assessmentSignoffSchema.safeParse(signoff);
      expect(result.success).toBe(true);
    });

    it("should allow optional notes and evidenceUrls", () => {
      const signoff = {
        learnerId: "550e8400-e29b-41d4-a716-446655440000",
        criteriaId: "660e8400-e29b-41d4-a716-446655440000",
        status: "COMPETENT",
        notes: "Great work on the joint alignment",
        evidenceUrls: ["https://example.com/evidence1.jpg"],
      };

      const result = assessmentSignoffSchema.safeParse(signoff);
      expect(result.success).toBe(true);
    });

    it("should accept valid assessment statuses", () => {
      const statuses = ["NOT_ASSESSED", "IN_PROGRESS", "COMPETENT", "NOT_YET_COMPETENT"];

      for (const status of statuses) {
        const result = assessmentSignoffSchema.safeParse({
          learnerId: "550e8400-e29b-41d4-a716-446655440000",
          criteriaId: "660e8400-e29b-41d4-a716-446655440000",
          status,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe("Auth Validations", () => {
  describe("loginSchema", () => {
    it("should validate valid login credentials", () => {
      const credentials = {
        email: "user@example.com",
        password: "anypassword",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const credentials = {
        email: "invalid-email",
        password: "password123",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const credentials = {
        email: "user@example.com",
        password: "",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("should validate valid registration data", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const data = {
        email: "john@example.com",
        password: "SecurePass123",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without lowercase", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "PASSWORD123",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePassword",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password under 8 characters", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "Pass1",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
