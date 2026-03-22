export default function CourseLoading() {
  return (
    <div className="min-h-screen bg-surface-hover animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="bg-green-700">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="h-4 w-24 bg-surface/20 rounded" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface/20" />
                <div className="h-3 w-28 bg-surface/20 rounded" />
              </div>
              <div className="h-10 w-80 bg-surface/20 rounded mb-3" />
              <div className="h-5 w-96 bg-surface/20 rounded" />
            </div>
            <div className="h-12 w-40 bg-surface/30 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats Section Skeleton */}
      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-active" />
                <div>
                  <div className="h-7 w-12 bg-surface-active rounded mb-1" />
                  <div className="h-3 w-16 bg-surface-active rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <div className="h-8 w-48 bg-surface-active rounded mb-2" />
          <div className="h-4 w-72 bg-surface-active rounded" />
        </div>

        {/* Module Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-5">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-surface-active" />
                <div className="flex-1">
                  <div className="h-5 w-64 bg-surface-active rounded mb-2" />
                  <div className="h-3 w-24 bg-surface-active rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 w-24 bg-surface-hover rounded-full" />
                    <div className="h-6 w-32 bg-surface-hover rounded-full" />
                    <div className="h-6 w-20 bg-surface-hover rounded-full" />
                  </div>
                </div>
                <div className="w-5 h-5 bg-surface-active rounded" />
              </div>
              <div className="mt-4 px-5">
                <div className="h-1.5 bg-surface-hover rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
