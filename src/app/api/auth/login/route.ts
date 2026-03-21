import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth-cookie';

export async function POST(request: NextRequest) {
  let step = 'init';
  try {
    step = 'parse-body';
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    step = 'db-lookup';
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        image: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    step = 'bcrypt-compare';
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update lastLoginAt (non-critical)
    step = 'update-login-time';
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => {
      console.error('[login] Failed to update lastLoginAt:', err);
    });

    step = 'create-response';
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
    });

    step = 'set-cookie';
    setSessionCookie(response, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[login] Failed at step "${step}":`, message);
    return NextResponse.json(
      { error: 'An unexpected error occurred', step, detail: message },
      { status: 500 }
    );
  }
}
