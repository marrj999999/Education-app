export default function CourseLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="bg-green-700">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="h-4 w-24 bg-white/20 rounded" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20" />
                <div className="h-3 w-28 bg-white/20 rounded" />
              </div>
              <div className="h-10 w-80 bg-white/20 rounded mb-3" />
              <div className="h-5 w-96 bg-white/20 rounded" />
            </div>
            <div className="h-12 w-40 bg-white/30 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats Section Skeleton */}
      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div>
                  <div className="h-7 w-12 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-72 bg-gray-200 rounded" />
        </div>

        {/* Module Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 w-64 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 w-24 bg-gray-100 rounded-full" />
                    <div className="h-6 w-32 bg-gray-100 rounded-full" />
                    <div className="h-6 w-20 bg-gray-100 rounded-full" />
                  </div>
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded" />
              </div>
              <div className="mt-4 px-5">
                <div className="h-1.5 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
