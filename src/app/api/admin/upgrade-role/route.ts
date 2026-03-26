import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * ONE-TIME migration endpoint to upgrade a user to SUPER_ADMIN.
 * Protected by a secret token. DELETE THIS FILE after use.
 *
 * Usage: POST /api/admin/upgrade-role
 * Body: { "email": "james@bamboobicycleclub.org", "secret": "<PAYLOAD_SECRET>" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, secret } = body;

    // Verify using PAYLOAD_SECRET as the authorization token
    const expectedSecret = (process.env.PAYLOAD_SECRET || '').replace(/\\n/g, '').trim();
    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: `User ${email} not found` }, { status: 404 });
    }

    const oldRole = user.role;

    // Upgrade to SUPER_ADMIN
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });

    return NextResponse.json({
      success: true,
      email,
      oldRole,
      newRole: 'SUPER_ADMIN',
      message: `Role upgraded from ${oldRole} to SUPER_ADMIN. DELETE this endpoint now.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
