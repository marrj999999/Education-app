'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LessonError({ error, reset }: ErrorProps) {
  const params = useParams();
  const courseSlug = params.courseSlug as string;

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Lesson page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-hover flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warning-light flex items-center justify-center">
          <svg
            className="w-8 h-8 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Unable to Load Lesson
        </h1>
        <p className="text-text-secondary mb-6">
          We had trouble loading this lesson content. This might be a temporary
          issue with our content system. Please try again.
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-gold text-forest font-medium rounded-lg hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-steel focus:ring-offset-2"
          >
            Try Again
          </button>

          <Link
            href={`/courses/${courseSlug}`}
            className="block w-full px-6 py-3 bg-surface-hover text-text-secondary font-medium rounded-lg hover:bg-surface-active transition-colors"
          >
            Back to Course
          </Link>

          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 text-text-tertiary font-medium hover:text-text-secondary transition-colors"
          >
            Return to Dashboard
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
