import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@prisma/client';

// ── Types ──────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  /** Unix timestamp (seconds) when the session expires */
  exp: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const COOKIE_NAME = 'bamboo-session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ── Helpers ────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET env var must be set (at least 32 characters). ' +
        'Generate with: openssl rand -hex 32'
    );
  }
  return secret;
}

/** HMAC-SHA256 sign a string and return the hex digest. */
function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('hex');
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Create a signed session token from a payload.
 * Format: base64(JSON) + '.' + hmacHex
 */
export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify a signed session token.
 * Returns the payload if valid and not expired, or null otherwise.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const encoded = token.slice(0, dotIndex);
    const providedSig = token.slice(dotIndex + 1);

    // Timing-safe comparison to prevent timing attacks
    const expectedSig = sign(encoded);
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload: SessionPayload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    );

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie on a NextResponse.
 */
export function setSessionCookie(
  response: NextResponse,
  payload: Omit<SessionPayload, 'exp'>
): NextResponse {
  const token = createSessionToken(payload);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

/**
 * Clear the session cookie on a NextResponse.
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Read and verify the session from a NextRequest (for use in middleware).
 */
export function getSessionFromRequest(
  request: NextRequest
): SessionPayload | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Read and verify the session from the Next.js cookies() API (for use in
 * server components and API routes).
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  // Dynamic import to avoid issues in middleware (which uses NextRequest cookies)
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
