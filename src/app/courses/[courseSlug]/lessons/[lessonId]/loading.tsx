export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Top Nav Skeleton */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-gray-200 rounded" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Cover Skeleton */}
      <div className="h-48 md:h-64 lg:h-72 w-full bg-gray-200" />

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 -mt-16 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-200" />
            <div className="flex-1">
              <div className="h-8 w-3/4 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 mt-6 mb-8">
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 rounded" />
            <div className="h-4 w-4/5 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
            <div className="h-32 w-full bg-gray-200 rounded mt-6" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
