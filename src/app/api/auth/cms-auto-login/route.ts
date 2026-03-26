import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getSessionFromRequest } from '@/lib/auth-cookie';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Deterministic password derived from PAYLOAD_SECRET + email
// This is never exposed to users — only used for server-side Payload login
function derivePayloadPassword(email: string): string {
  const secret = (process.env.PAYLOAD_SECRET || 'default-secret').replace(/\\n/g, '').trim();
  return crypto.createHmac('sha256', secret).update(`cms-auto:${email}`).digest('hex');
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
    console.log('[cms-auto-login] No valid session or insufficient role');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const redirect = request.nextUrl.searchParams.get('redirect') || '/cms';

  try {
    console.log('[cms-auto-login] Starting for:', session.email);
    const payload = await getPayload({ config });
    const derivedPassword = derivePayloadPassword(session.email);

    // Step 1: Find or create Payload user
    const existing = await payload.find({
      collection: 'payload-users',
      where: { email: { equals: session.email } },
      limit: 1,
    });

    if (existing.docs.length === 0) {
      console.log('[cms-auto-login] Creating new Payload user:', session.email);
      await payload.create({
        collection: 'payload-users',
        data: {
          email: session.email,
          password: derivedPassword,
          name: session.email.split('@')[0],
          role: 'admin',
        },
      });
      console.log('[cms-auto-login] User created');
    } else {
      console.log('[cms-auto-login] Updating password for existing user:', existing.docs[0].id);
      await payload.update({
        collection: 'payload-users',
        id: existing.docs[0].id,
        data: { password: derivedPassword },
      });
      console.log('[cms-auto-login] Password updated');
    }

    // Step 2: Login to Payload
    console.log('[cms-auto-login] Calling payload.login()');
    const result = await payload.login({
      collection: 'payload-users',
      data: {
        email: session.email,
        password: derivedPassword,
      },
    });
    console.log('[cms-auto-login] Login result - token:', result.token ? 'present' : 'MISSING', 'user:', result.user?.email);

    // Step 3: Set cookie and redirect
    const response = NextResponse.redirect(new URL(redirect, request.url));
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800, // 7 days
      });
      console.log('[cms-auto-login] Cookie set, redirecting to:', redirect);
    } else {
      console.error('[cms-auto-login] No token returned from payload.login()');
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cms-auto-login] Failed:', message);
    // Fallback: redirect to CMS (Payload login page)
    return NextResponse.redirect(new URL(redirect, request.url));
  }
}
