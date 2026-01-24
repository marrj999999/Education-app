import Link from 'next/link';
import { DocumentIcon, HomeIcon } from '@/components/Icons';

export default function LessonNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <DocumentIcon size={40} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Lesson Not Found
        </h1>
        <p className="text-gray-600 mb-6 max-w-md">
          We couldn&apos;t find the lesson you&apos;re looking for. It may have been moved or deleted from Notion.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <HomeIcon size={20} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
