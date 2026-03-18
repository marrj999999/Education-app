import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/auth/session
 *
 * Returns the current user's session data from the signed session cookie.
 * Used by the client-side SessionProvider.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
