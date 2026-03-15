// Legacy NextAuth catch-all route - kept for backwards compatibility.
// Auth is now handled by Supabase. This route returns 410 Gone.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Auth has migrated to Supabase magic link. Use /auth/login instead.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Auth has migrated to Supabase magic link. Use /auth/login instead.' },
    { status: 410 }
  );
}
