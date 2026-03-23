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
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const redirect = request.nextUrl.searchParams.get('redirect') || '/cms';

  try {
    const payload = await getPayload({ config });
    const derivedPassword = derivePayloadPassword(session.email);

    // Find existing Payload user
    const existing = await payload.find({
      collection: 'payload-users',
      where: { email: { equals: session.email } },
      limit: 1,
    });

    if (existing.docs.length === 0) {
      // Create Payload user with derived password
      await payload.create({
        collection: 'payload-users',
        data: {
          email: session.email,
          password: derivedPassword,
          name: session.email.split('@')[0],
          role: 'admin',
        },
      });
    } else {
      // Update password to derived value (ensures it matches)
      await payload.update({
        collection: 'payload-users',
        id: existing.docs[0].id,
        data: { password: derivedPassword },
      });
    }

    // Login to Payload using the derived password
    const result = await payload.login({
      collection: 'payload-users',
      data: {
        email: session.email,
        password: derivedPassword,
      },
    });

    // Set Payload auth cookie and redirect to CMS
    const response = NextResponse.redirect(new URL(redirect, request.url));
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800, // 7 days
      });
    }

    return response;
  } catch (error) {
    console.error('[cms-auto-login] Failed:', error);
    // Fallback: redirect to CMS login page (manual login)
    return NextResponse.redirect(new URL(redirect, request.url));
  }
}
