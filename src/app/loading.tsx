export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="bg-green-700">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/20" />
            <div className="h-3 w-32 bg-white/20 rounded" />
          </div>
          <div className="h-12 w-96 bg-white/20 rounded mb-4" />
          <div className="h-5 w-[500px] bg-white/20 rounded mb-2" />
          <div className="h-5 w-80 bg-white/20 rounded" />
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div>
                  <div className="h-7 w-8 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Cards Skeleton */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-40 bg-gray-200" />
              <div className="p-6">
                <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-full bg-gray-100 rounded mb-1" />
                <div className="h-4 w-3/4 bg-gray-100 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
