export default function DashboardLayoutLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="p-6 space-y-6 w-full h-full animate-fade-in select-none"
    >
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton h-6 w-56 rounded" />
            <div className="skeleton h-5 w-24 rounded" />
          </div>
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="skeleton h-9 w-40 rounded-md" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3.5 w-24 rounded" />
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
            <div className="skeleton h-7 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Panel Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-36 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          <div className="skeleton h-64 w-full rounded-lg" />
        </div>
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-36 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          <div className="skeleton h-64 w-full rounded-lg" />
        </div>
      </div>

      <span className="sr-only">Loading dashboard layout...</span>
    </div>
  );
}
