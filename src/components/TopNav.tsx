'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { BambooIcon, MenuIcon } from '@/components/Icons';
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
          ? 'bg-blue-500 text-white shadow-sm ring-2 ring-blue-300'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      )}
      aria-label={isEditModeEnabled ? 'Exit edit mode' : 'Enter edit mode'}
      aria-pressed={isEditModeEnabled}
      title={isEditModeEnabled ? 'Edit Mode ON — click to exit' : 'Edit Mode — click to enable'}
    >
      <Pencil size={18} />
    </button>
  );
}

export default function TopNav({ onMenuToggle, showMenuButton = false, user }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-3">
          {showMenuButton && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-hover"
              aria-label="Toggle menu"
            >
              <MenuIcon size={24} className="text-text-secondary" />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center shadow-sm">
              <BambooIcon size={24} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-text-primary">Bamboo Bicycle Club</p>
              <p className="text-xs text-text-tertiary">Instructor Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Right: Edit toggle + Theme toggle + User menu */}
        <div className="flex items-center gap-2">
          {/* Edit Mode Toggle — ADMIN and SUPER_ADMIN */}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && <EditModeToggle />}
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
