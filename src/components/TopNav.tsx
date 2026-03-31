'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { MenuIcon } from '@/components/Icons';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/auth/UserMenu';
import { useGlobalEditMode } from '@/context/GlobalEditModeContext';
import { cn } from '@/lib/utils';
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
  actionButtons?: React.ReactNode;
}

/** Edit mode toggle button for the TopNav — wired to GlobalEditModeContext */
function EditModeToggle() {
  const { isEditModeEnabled, toggleEditMode } = useGlobalEditMode();

  return (
    <button
      onClick={toggleEditMode}
      className={cn(
        'p-2 rounded-lg transition-all',
        isEditModeEnabled
          ? 'bg-white/20 text-white ring-2 ring-gold'
          : 'text-white/60 hover:text-white hover:bg-white/10',
      )}
      aria-label={isEditModeEnabled ? 'Exit edit mode' : 'Enter edit mode'}
      aria-pressed={isEditModeEnabled}
      title={isEditModeEnabled ? 'Edit Mode ON — click to exit' : 'Edit Mode — click to enable'}
    >
      <Pencil size={18} />
    </button>
  );
}

export default function TopNav({ onMenuToggle, showMenuButton = false, user, actionButtons }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-forest shadow-lg">
      <div className="flex items-center justify-between px-6 h-20">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-3">
          {showMenuButton && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 -ml-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Toggle menu"
            >
              <MenuIcon size={24} />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/logo-bbc.png" alt="Bamboo Bicycle Club" className="h-12 w-auto brightness-0 invert" />
            <div className="hidden sm:block">
              <p className="font-bold text-white text-sm">Bamboo Bicycle Club</p>
              <p className="text-xs text-white/60">Instructor Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Right: Action buttons + Edit toggle + Theme toggle + User menu */}
        <div className="flex items-center gap-2">
          {actionButtons}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && <EditModeToggle />}
          <ThemeToggle variant="dark" />
          {user ? (
            <UserMenu user={user} variant="dark" />
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
