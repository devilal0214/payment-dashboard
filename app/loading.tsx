export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 select-none animate-fade-in"
    >
      <div className="flex flex-col items-center text-center p-6 max-w-sm">
        {/* ReFly Logo Badge */}
        <div className="w-12 h-12 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-mono font-bold text-base shadow-subtle mb-4 animate-pulse">
          RF
        </div>

        {/* Monochromatic Spinner */}
        <div className="relative w-8 h-8 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-200" />
          <div className="absolute inset-0 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
        </div>

        {/* Text Details */}
        <h2 className="text-base font-bold text-zinc-950 tracking-tight">
          Loading dashboard...
        </h2>
        <p className="text-xs text-zinc-500 mt-1 font-mono">
          Fetching reporting data...
        </p>

        <span className="sr-only">Loading ReFly Payment Reporting Console...</span>
      </div>
    </div>
  );
}
