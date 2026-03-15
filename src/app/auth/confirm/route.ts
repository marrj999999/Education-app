import { type NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm
 *
 * Handles the magic link callback from Supabase.
 * Verifies the token and redirects to dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'magiclink',
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If verification fails, redirect to login with error
  return NextResponse.redirect(
    new URL('/auth/login?error=InvalidLink', request.url)
  );
}
