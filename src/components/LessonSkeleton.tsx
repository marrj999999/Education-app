'use client';

export function LessonSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-8 bg-[var(--surface-active)] rounded w-3/4" />
        <div className="flex gap-4">
          <div className="h-4 bg-[var(--surface-active)] rounded w-24" />
          <div className="h-4 bg-[var(--surface-active)] rounded w-32" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--surface-active)]" />

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 bg-[var(--surface-active)] rounded w-full" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-5/6" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-4/5" />
      </div>

      {/* Section skeleton */}
      <div className="space-y-3 pt-4">
        <div className="h-6 bg-[var(--surface-active)] rounded w-1/3" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-full" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-5/6" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-4/5" />
      </div>

      {/* List skeleton */}
      <div className="space-y-2 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[var(--surface-active)] rounded" />
            <div className="h-4 bg-[var(--surface-active)] rounded flex-1" />
          </div>
        ))}
      </div>

      {/* Card skeleton */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div className="h-5 bg-[var(--surface-active)] rounded w-1/4" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-full" />
        <div className="h-4 bg-[var(--surface-active)] rounded w-3/4" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Logo skeleton */}
      <div className="h-10 bg-[var(--surface-active)] rounded" />

      {/* Navigation items skeleton */}
      <div className="space-y-2 pt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-5 h-5 bg-[var(--surface-active)] rounded" />
            <div className="h-4 bg-[var(--surface-active)] rounded flex-1" />
          </div>
        ))}
      </div>

      {/* Section divider */}
      <div className="h-px bg-[var(--surface-active)] my-4" />

      {/* Module items skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-2">
            <div className="h-5 bg-[var(--surface-active)] rounded w-2/3 mb-2" />
            <div className="space-y-1 pl-4">
              {[1, 2].map((j) => (
                <div key={j} className="h-4 bg-[var(--surface-active)] rounded w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LessonSkeleton;
