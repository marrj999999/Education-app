export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[var(--surface-hover)] animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="bg-[var(--forest)]">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface)]/20" />
            <div className="h-3 w-32 bg-[var(--surface)]/20 rounded" />
          </div>
          <div className="h-12 w-96 bg-[var(--surface)]/20 rounded mb-4" />
          <div className="h-5 w-[500px] bg-[var(--surface)]/20 rounded mb-2" />
          <div className="h-5 w-80 bg-[var(--surface)]/20 rounded" />
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-5 shadow-sm border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-active)]" />
                <div>
                  <div className="h-7 w-8 bg-[var(--surface-active)] rounded mb-1" />
                  <div className="h-3 w-20 bg-[var(--surface-active)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Cards Skeleton */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="h-8 w-40 bg-[var(--surface-active)] rounded mb-2" />
          <div className="h-4 w-64 bg-[var(--surface-active)] rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
              <div className="h-40 bg-[var(--surface-active)]" />
              <div className="p-6">
                <div className="h-6 w-48 bg-[var(--surface-active)] rounded mb-2" />
                <div className="h-4 w-full bg-[var(--surface-hover)] rounded mb-1" />
                <div className="h-4 w-3/4 bg-[var(--surface-hover)] rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-[var(--surface-hover)] rounded-full" />
                  <div className="h-6 w-20 bg-[var(--surface-hover)] rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
