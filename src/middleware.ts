import { NextResponse, type NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-cookie';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

// Routes that don't require authentication
const publicRoutes = ['/auth/login', '/auth/error'];

// Routes that require admin access
const adminRoutes = ['/admin'];

// API routes that handle their own auth
const apiRoutes = ['/api/auth', '/api/progress', '/api/payload', '/api/lessons'];

// Payload CMS routes (handled by Payload's own auth)
const payloadRoutes = ['/cms', '/api/payload'];

// Rate-limited endpoints (only the API, not the page itself)
const rateLimitedEndpoints = [
  { path: '/api/auth/login', config: RATE_LIMITS.login },
];

/**
 * Validate that a callback URL is safe (same origin)
 */
function isValidCallbackUrl(callbackUrl: string, requestUrl: URL): boolean {
  if (callbackUrl.startsWith('/')) {
    return !callbackUrl.startsWith('//');
  }
  try {
    const callback = new URL(callbackUrl);
    return callback.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const clientIP = getClientIP(req);


  // Payload CMS routes — auto-login super admins, let others through
  if (payloadRoutes.some((route) => pathname.startsWith(route))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    const session = getSessionFromRequest(req);
    if (session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN') {
      const payloadToken = req.cookies.get('payload-token')?.value;
      let needsLogin = !payloadToken;

      // Check if existing token is expired (JWT payload is base64 middle segment)
      if (payloadToken && !needsLogin) {
        try {
          const payload = JSON.parse(Buffer.from(payloadToken.split('.')[1], 'base64').toString());
          if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            needsLogin = true; // Token expired, need to refresh
          }
        } catch {
          needsLogin = true; // Invalid token, re-login
        }
      }

      if (needsLogin) {
        const autoLoginUrl = new URL('/api/auth/cms-auto-login', req.url);
        autoLoginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(autoLoginUrl);
      }
    }

    return NextResponse.next();
  }

  // Add security headers
  const addSecurityHeaders = (response: NextResponse) => {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  };

  // Skip rate limiting in CI/test environment
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

  // Check rate limiting
  const rateLimitConfig = rateLimitedEndpoints.find(
    (endpoint) =>
      pathname === endpoint.path || pathname.startsWith(`${endpoint.path}/`)
  );

  if (rateLimitConfig && !isCI) {
    const result = checkRateLimit(
      `${clientIP}:${rateLimitConfig.path}`,
      rateLimitConfig.config
    );
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
            'Retry-After': String(
              Math.ceil((result.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }
  }

  // Skip auth for API routes (they handle their own auth)
  if (apiRoutes.some((route) => pathname.startsWith(route))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Read the session from the signed cookie
  const session = getSessionFromRequest(req);

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    // If user is logged in and trying to access auth pages, redirect to dashboard
    if (session && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL('/auth/login', req.url);
    const fullPath = pathname + req.nextUrl.search;
    if (isValidCallbackUrl(pathname, req.nextUrl)) {
      loginUrl.searchParams.set('callbackUrl', fullPath);
    } else {
      loginUrl.searchParams.set('callbackUrl', '/dashboard');
    }
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes — role is embedded in the signed cookie, no DB query needed
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const runtime = 'nodejs';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
