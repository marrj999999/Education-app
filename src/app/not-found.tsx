import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-hover)]">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-[var(--text-primary)]">404</h1>
        <p className="mt-4 text-xl text-[var(--text-secondary)]">Page not found</p>
        <p className="mt-2 text-[var(--text-tertiary)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-[var(--gold)] text-[var(--forest)] font-medium rounded-lg hover:brightness-110 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
