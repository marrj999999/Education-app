'use client';

import React from 'react';
import Link from 'next/link';
import { BambooIcon, MenuIcon } from '@/components/Icons';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/auth/UserMenu';
import type { Role } from '@prisma/client';

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  user?: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role: Role;
  } | null;
}

export default function TopNav({ onMenuToggle, showMenuButton = false, user }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-3">
          {showMenuButton && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--surface-hover)]"
              aria-label="Toggle menu"
            >
              <MenuIcon size={24} className="text-[var(--text-secondary)]" />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--forest)] flex items-center justify-center shadow-sm">
              <BambooIcon size={24} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-[var(--text-primary)]">Bamboo Bicycle Club</p>
              <p className="text-xs text-[var(--text-tertiary)]">Instructor Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Right: Theme toggle + User menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
