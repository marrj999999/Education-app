import Link from 'next/link';
import { BookIcon, HomeIcon } from '@/components/Icons';

export default function CourseNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-hover flex items-center justify-center">
          <BookIcon size={40} className="text-text-tertiary" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Course Not Found
        </h1>
        <p className="text-text-secondary mb-6 max-w-md">
          We couldn&apos;t find the course you&apos;re looking for. It may not be available yet or the link may be incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <HomeIcon size={20} />
          Back to All Courses
        </Link>
      </div>
    </div>
  );
}
