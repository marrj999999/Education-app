/**
 * Standard error codes for the application
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: "AUTH_001",
  FORBIDDEN: "AUTH_002",
  INVALID_CREDENTIALS: "AUTH_003",
  SESSION_EXPIRED: "AUTH_004",

  // Resource errors
  NOT_FOUND: "RESOURCE_001",
  ALREADY_EXISTS: "RESOURCE_002",
  CONFLICT: "RESOURCE_003",

  // Validation errors
  VALIDATION_ERROR: "INPUT_001",
  INVALID_FORMAT: "INPUT_002",
  MISSING_REQUIRED: "INPUT_003",

  // Database errors
  DATABASE_ERROR: "DB_001",
  CONNECTION_ERROR: "DB_002",
  QUERY_ERROR: "DB_003",

  // External service errors
  NOTION_SYNC_ERROR: "EXTERNAL_001",
  UPLOAD_ERROR: "EXTERNAL_002",

  // Server errors
  INTERNAL_ERROR: "SERVER_001",
  RATE_LIMITED: "SERVER_002",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Capture exception to Sentry if available
 */
function captureException(error: Error, extra?: Record<string, unknown>) {
  // Dynamic import to avoid build errors if Sentry not installed
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    Sentry.captureException(error, { extra });
  } catch {
    // Sentry not installed - log to console instead
    console.error("[Error]", error.message, extra);
  }
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly errorId: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.errorId = this.generateErrorId();

    // Capture in Sentry for server errors
    if (statusCode >= 500) {
      captureException(this, {
        code,
        context,
        errorId: this.errorId,
      });
    }
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      errorId: this.errorId,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === "development" && { context: this.context }),
    };
  }
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(error: AppError | Error) {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { status: error.statusCode });
  }

  // Unknown error - log
  captureException(error);

  const appError = new AppError(
    "An unexpected error occurred",
    ErrorCodes.INTERNAL_ERROR,
    500
  );

  return Response.json(appError.toJSON(), { status: 500 });
}

/**
 * Helper functions for common errors
 */
export const Errors = {
  unauthorized: (message = "Unauthorized") =>
    new AppError(message, ErrorCodes.UNAUTHORIZED, 401),

  forbidden: (message = "Forbidden") =>
    new AppError(message, ErrorCodes.FORBIDDEN, 403),

  notFound: (resource = "Resource") =>
    new AppError(`${resource} not found`, ErrorCodes.NOT_FOUND, 404),

  validation: (message: string, context?: Record<string, unknown>) =>
    new AppError(message, ErrorCodes.VALIDATION_ERROR, 400, context),

  conflict: (message: string) =>
    new AppError(message, ErrorCodes.CONFLICT, 409),

  rateLimited: (message = "Too many requests") =>
    new AppError(message, ErrorCodes.RATE_LIMITED, 429),

  internal: (message = "Internal server error", context?: Record<string, unknown>) =>
    new AppError(message, ErrorCodes.INTERNAL_ERROR, 500, context),
};
