import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * ONE-TIME setup endpoint. DELETE after use.
 * POST /api/setup-admin { "email": "...", "key": "<PAYLOAD_SECRET>" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, key } = body;

    const secret = (process.env.PAYLOAD_SECRET || '').replace(/\\n/g, '').trim();
    if (!key || key !== secret) {
      return NextResponse.json({ error: 'Bad key' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });

    return NextResponse.json({
      ok: true,
      was: user.role,
      now: 'SUPER_ADMIN',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready' });
}
