import { AppError, ErrorCodes, Errors, createErrorResponse } from "@/lib/errors";

describe("ErrorCodes", () => {
  it("should have unique error codes", () => {
    const codes = Object.values(ErrorCodes);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("should have correct prefixes for categories", () => {
    expect(ErrorCodes.UNAUTHORIZED).toMatch(/^AUTH_/);
    expect(ErrorCodes.NOT_FOUND).toMatch(/^RESOURCE_/);
    expect(ErrorCodes.VALIDATION_ERROR).toMatch(/^INPUT_/);
    expect(ErrorCodes.DATABASE_ERROR).toMatch(/^DB_/);
    expect(ErrorCodes.INTERNAL_ERROR).toMatch(/^SERVER_/);
  });
});

describe("AppError", () => {
  it("should create error with required properties", () => {
    const error = new AppError("Test error", ErrorCodes.VALIDATION_ERROR, 400);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe("AppError");
    expect(error.timestamp).toBeDefined();
    expect(error.errorId).toMatch(/^ERR_/);
  });

  it("should include context when provided", () => {
    const context = { field: "email", value: "invalid" };
    const error = new AppError(
      "Validation failed",
      ErrorCodes.VALIDATION_ERROR,
      400,
      context
    );

    expect(error.context).toEqual(context);
  });

  it("should generate unique error IDs", () => {
    const error1 = new AppError("Error 1", ErrorCodes.INTERNAL_ERROR);
    const error2 = new AppError("Error 2", ErrorCodes.INTERNAL_ERROR);

    expect(error1.errorId).not.toBe(error2.errorId);
  });

  it("should default statusCode to 500", () => {
    const error = new AppError("Server error", ErrorCodes.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
  });

  describe("toJSON", () => {
    it("should return serializable object", () => {
      const error = new AppError("Test", ErrorCodes.NOT_FOUND, 404);
      const json = error.toJSON();

      expect(json).toHaveProperty("error", "Test");
      expect(json).toHaveProperty("code", ErrorCodes.NOT_FOUND);
      expect(json).toHaveProperty("errorId");
      expect(json).toHaveProperty("timestamp");
    });

    it("should exclude context in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new AppError("Test", ErrorCodes.NOT_FOUND, 404, {
        secret: "data",
      });
      const json = error.toJSON();

      expect(json).not.toHaveProperty("context");

      process.env.NODE_ENV = originalEnv;
    });

    it("should include context in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new AppError("Test", ErrorCodes.NOT_FOUND, 404, {
        field: "id",
      });
      const json = error.toJSON();

      expect(json).toHaveProperty("context");
      expect(json.context).toEqual({ field: "id" });

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe("Errors helper functions", () => {
  it("should create unauthorized error", () => {
    const error = Errors.unauthorized();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    expect(error.message).toBe("Unauthorized");
  });

  it("should create unauthorized error with custom message", () => {
    const error = Errors.unauthorized("Token expired");
    expect(error.message).toBe("Token expired");
  });

  it("should create forbidden error", () => {
    const error = Errors.forbidden();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(ErrorCodes.FORBIDDEN);
  });

  it("should create not found error", () => {
    const error = Errors.notFound("User");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(error.message).toBe("User not found");
  });

  it("should create validation error with context", () => {
    const error = Errors.validation("Invalid email", { field: "email" });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(error.context).toEqual({ field: "email" });
  });

  it("should create conflict error", () => {
    const error = Errors.conflict("Email already exists");
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe(ErrorCodes.CONFLICT);
  });

  it("should create rate limited error", () => {
    const error = Errors.rateLimited();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
  });

  it("should create internal error", () => {
    const error = Errors.internal();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });
});

describe("createErrorResponse", () => {
  it("should create Response from AppError", () => {
    const error = Errors.notFound("Cohort");
    const response = createErrorResponse(error);

    expect(response.status).toBe(404);
  });

  it("should handle generic Error", () => {
    const error = new Error("Something went wrong");
    const response = createErrorResponse(error);

    expect(response.status).toBe(500);
  });
});
