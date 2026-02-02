import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

// Force Node.js runtime for Prisma compatibility (Edge Runtime doesn't support Prisma)
export const runtime = 'nodejs';

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/verify',
  '/auth/reset-password',
  '/demo',
];

// Routes that require admin access
const adminRoutes = ['/admin'];

// API routes that should be excluded from middleware auth redirect
// (these routes handle their own authentication and return proper status codes)
const apiRoutes = ['/api/auth', '/api/progress'];

// Rate-limited endpoints
const rateLimitedEndpoints = [
  { path: '/auth/login', config: RATE_LIMITS.login },
  { path: '/auth/register', config: RATE_LIMITS.register },
  { path: '/api/auth/register', config: RATE_LIMITS.register },
];

/**
 * Validate that a callback URL is safe (same origin)
 */
function isValidCallbackUrl(callbackUrl: string, requestUrl: URL): boolean {
  // Only allow relative paths or same-origin URLs
  if (callbackUrl.startsWith('/')) {
    // Prevent protocol-relative URLs like //evil.com
    return !callbackUrl.startsWith('//');
  }

  try {
    const callback = new URL(callbackUrl);
    return callback.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const clientIP = getClientIP(req);

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Skip rate limiting in CI/test environment
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

  // Check rate limiting for specific endpoints
  const rateLimitConfig = rateLimitedEndpoints.find(
    (endpoint) => pathname === endpoint.path || pathname.startsWith(`${endpoint.path}/`)
  );

  if (rateLimitConfig && !isCI) {
    const result = checkRateLimit(`${clientIP}:${rateLimitConfig.path}`, rateLimitConfig.config);

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimitConfig.config.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetTime),
          },
        }
      );
    }

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.config.limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.resetTime));
  }

  // Skip further middleware for API routes
  if (apiRoutes.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Allow public routes
  if (isPublicRoute) {
    // If user is logged in and trying to access auth pages, redirect to dashboard
    if (session && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return response;
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL('/auth/login', req.url);

    // SECURITY: Validate callback URL to prevent open redirect attacks
    if (isValidCallbackUrl(pathname, req.nextUrl)) {
      loginUrl.searchParams.set('callbackUrl', pathname);
    } else {
      // Default to dashboard if callback URL is invalid
      loginUrl.searchParams.set('callbackUrl', '/dashboard');
    }

    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    const userRole = session.user?.role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      // Redirect non-admin users to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
