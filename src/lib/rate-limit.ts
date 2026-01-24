/**
 * Simple in-memory rate limiter for Edge Runtime compatibility
 *
 * For production with multiple instances, consider using:
 * - Upstash Redis (@upstash/ratelimit)
 * - Cloudflare Rate Limiting
 * - Your hosting provider's rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - reset on server restart
// For production, use Redis or similar persistent store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    };
    rateLimitStore.set(key, newEntry);
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get the client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback for local development
  return '127.0.0.1';
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits to prevent brute force
  login: { limit: 5, windowSeconds: 60 },      // 5 attempts per minute
  register: { limit: 3, windowSeconds: 60 },   // 3 registrations per minute

  // API endpoints - more generous limits
  api: { limit: 100, windowSeconds: 60 },      // 100 requests per minute

  // Admin endpoints
  admin: { limit: 50, windowSeconds: 60 },     // 50 requests per minute
} as const;
