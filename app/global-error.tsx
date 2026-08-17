'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.error('[GLOBAL ERROR DIAGNOSTIC]', {
      timestamp,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html>
      <body className="bg-zinc-50 font-sans antialiased text-zinc-900 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-lg shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold text-zinc-950">Application Navigation Notice</h2>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            The page encountered an unhandled interface notice. Your active data session remains safe.
          </p>
          {error.digest && (
            <div className="p-2 bg-zinc-100 rounded text-[10px] font-mono text-zinc-500">
              Digest: {error.digest}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/dashboard'; }}
              className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
