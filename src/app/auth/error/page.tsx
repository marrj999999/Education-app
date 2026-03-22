'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BambooIcon, WarningIcon } from '@/components/Icons';

const errorMessages: Record<string, string> = {
  InvalidLink: 'The login link is invalid or has expired. Please try again.',
  AccessDenied: 'You do not have permission to sign in.',
  SessionRequired: 'Please sign in to access this page.',
  Default: 'An unexpected error occurred. Please try again.',
};

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-forest flex items-center justify-center shadow-lg mx-auto mb-4">
              <BambooIcon size={28} className="text-white" />
            </div>
            <p className="text-text-tertiary">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const errorMessage =
    errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-forest flex items-center justify-center shadow-lg">
            <BambooIcon size={28} className="text-white" />
          </div>
          <span className="text-xl font-bold text-text-primary">
            Bamboo Bicycle Club
          </span>
        </Link>

        {/* Error Card */}
        <div className="bg-surface rounded-2xl shadow-xl border border-border p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger-light flex items-center justify-center">
            <WarningIcon size={32} className="text-danger" />
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-3">
            Authentication Error
          </h1>

          <p className="text-text-secondary mb-6">{errorMessage}</p>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-4 bg-gold text-forest font-semibold rounded-xl hover:brightness-110 transition-all"
            >
              Try again
            </Link>

            <Link
              href="/"
              className="block w-full py-3 px-4 border border-border text-text-secondary font-medium rounded-xl hover:bg-surface-hover transition-all"
            >
              Go to homepage
            </Link>
          </div>
        </div>

        {/* Help Link */}
        <p className="mt-6 text-sm text-text-tertiary">
          Need help?{' '}
          <a
            href="mailto:support@bamboobicycleclub.org"
            className="text-teal hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
