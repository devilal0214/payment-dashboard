'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="card p-8 max-w-md mx-auto my-12 text-center space-y-4 shadow-card select-none">
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-bold text-zinc-950 tracking-tight">
          Unable to load this page
        </h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          The requested dashboard view encountered an issue loading reporting data.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold py-2 px-4 rounded-md transition-all shadow-subtle"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = '/dashboard'; }}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold py-2 px-4 rounded-md border border-zinc-200 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
