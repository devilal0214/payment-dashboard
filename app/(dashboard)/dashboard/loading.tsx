export default function DashboardRouteLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-6 animate-fade-in pb-8 select-none"
    >
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-6 w-64 rounded" />
            <div className="skeleton h-5 w-24 rounded" />
          </div>
          <div className="skeleton h-4 w-96 rounded mt-2" />
        </div>
        <div className="skeleton h-9 w-44 rounded-md" />
      </div>

      {/* 10 KPI Cards Skeleton (5 columns grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3.5 w-20 rounded" />
              <div className="skeleton h-4 w-12 rounded-full" />
            </div>
            <div className="skeleton h-8 w-24 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1 Skeleton */}
        <div className="card p-5 space-y-4 bg-white border border-zinc-200 shadow-card">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="space-y-1">
              <div className="skeleton h-4 w-44 rounded" />
              <div className="skeleton h-3 w-56 rounded" />
            </div>
            <div className="skeleton h-7 w-28 rounded-md" />
          </div>
          <div className="skeleton h-56 w-full rounded-md" />
        </div>

        {/* Chart 2 Skeleton */}
        <div className="card p-5 space-y-4 bg-white border border-zinc-200 shadow-card">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="space-y-1">
              <div className="skeleton h-4 w-44 rounded" />
              <div className="skeleton h-3 w-56 rounded" />
            </div>
            <div className="skeleton h-7 w-28 rounded-md" />
          </div>
          <div className="skeleton h-56 w-full rounded-md" />
        </div>
      </div>

      {/* Footer Banner Skeleton */}
      <div className="card p-4 bg-zinc-900 border-zinc-900 flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-72 bg-zinc-800 rounded" />
          <div className="skeleton h-3 w-96 bg-zinc-800 rounded" />
        </div>
        <div className="skeleton h-9 w-40 bg-zinc-800 rounded-md" />
      </div>

      <span className="sr-only">Loading dashboard analytics and metrics...</span>
    </div>
  );
}
