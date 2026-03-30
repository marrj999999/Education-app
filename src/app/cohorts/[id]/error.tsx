'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CohortDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Cohort detail page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-hover flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger-light flex items-center justify-center">
          <svg
            className="w-8 h-8 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Unable to Load Cohort
        </h1>
        <p className="text-text-secondary mb-6">
          We encountered an issue loading this cohort. This could be a temporary
          problem.
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-gold text-forest font-medium rounded-lg hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-steel focus:ring-offset-2"
          >
            Try Again
          </button>

          <Link
            href="/cohorts"
            className="block w-full px-6 py-3 bg-surface-hover text-text-secondary font-medium rounded-lg hover:bg-surface-active transition-colors"
          >
            Back to Cohorts
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-surface-hover rounded text-xs text-text-secondary overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
