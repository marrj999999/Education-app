'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BambooIcon, WarningIcon } from '@/components/Icons';

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link may have expired or already been used.',
  OAuthSignin: 'Error in constructing an authorization URL.',
  OAuthCallback: 'Error in handling the response from the OAuth provider.',
  OAuthCreateAccount: 'Could not create OAuth provider user in the database.',
  EmailCreateAccount: 'Could not create email provider user in the database.',
  Callback: 'Error in the OAuth callback handler.',
  OAuthAccountNotLinked:
    'This email is already associated with another account. Please sign in with your original method.',
  CredentialsSignin: 'The email or password you entered is incorrect.',
  SessionRequired: 'Please sign in to access this page.',
  Default: 'An unexpected error occurred. Please try again.',
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const errorMessage =
    errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-green-700 flex items-center justify-center shadow-lg">
            <BambooIcon size={28} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Bamboo Bicycle Club
          </span>
        </Link>

        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <WarningIcon size={32} className="text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Authentication Error
          </h1>

          <p className="text-gray-600 mb-6">{errorMessage}</p>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all"
            >
              Try again
            </Link>

            <Link
              href="/"
              className="block w-full py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              Go to homepage
            </Link>
          </div>
        </div>

        {/* Help Link */}
        <p className="mt-6 text-sm text-gray-500">
          Need help?{' '}
          <a
            href="mailto:support@bamboobicycleclub.org"
            className="text-green-600 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
