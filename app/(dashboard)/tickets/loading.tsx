export default function TicketsRouteLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col h-full gap-4 animate-fade-in select-none"
    >
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-zinc-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="skeleton h-6 w-40 rounded" />
            <div className="skeleton h-5 w-24 rounded" />
          </div>
          <div className="skeleton h-3.5 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-8 w-28 rounded-md" />
          <div className="skeleton h-8 w-28 rounded-md" />
          <div className="skeleton h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Search Input Bar Skeleton */}
      <div className="skeleton h-9 w-full rounded-md" />

      {/* Table Container Skeleton */}
      <div className="card overflow-hidden flex-1 flex flex-col min-h-[400px]">
        {/* Table Header Bar Skeleton */}
        <div className="h-10 bg-zinc-100 border-b border-zinc-200 px-4 flex items-center justify-between">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>

        {/* Rows Skeleton */}
        <div className="p-4 space-y-3 flex-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 w-6 rounded shrink-0" />
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-44 rounded flex-1" />
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>

        {/* Pagination Bar Skeleton */}
        <div className="border-t border-zinc-200 p-3 bg-white flex items-center justify-between">
          <div className="skeleton h-4 w-44 rounded" />
          <div className="skeleton h-7 w-48 rounded" />
        </div>
      </div>

      <span className="sr-only">Loading claims table and filters...</span>
    </div>
  );
}
