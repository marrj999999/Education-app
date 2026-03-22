'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function LessonErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Lesson error:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-text-secondary mb-6">
          {error.message || 'Failed to load lesson content. This might be a temporary issue.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold text-forest font-medium rounded-lg hover:brightness-110 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          >
            <RefreshCw size={18} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-surface-hover text-text-secondary rounded-lg hover:bg-surface-active transition-colors"
          >
            Back to home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="mt-4 text-xs text-text-tertiary font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

export default LessonErrorBoundary;
