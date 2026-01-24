export default function LessonLoading() {
  return (
    <div className="min-h-screen">
      {/* Cover skeleton */}
      <div className="h-48 md:h-64 w-full bg-gray-200 animate-pulse" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-6" />

        {/* Title skeleton */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1">
              <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Button skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse mt-8" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 w-full bg-gray-200 rounded-lg animate-pulse mt-4" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
