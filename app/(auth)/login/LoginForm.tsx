'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 select-none">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-950 text-white font-mono font-bold text-base shadow-subtle mb-3">
            RF
          </div>
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight">ReFly Payment Reporting</h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">Internal Operations Console</p>
        </div>

        {/* Login Card */}
        <div className="card p-6 bg-white border border-zinc-200 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-base"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-bold py-2.5 px-4 rounded-md transition-all text-xs shadow-subtle"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2 font-mono">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] font-mono text-zinc-400 mt-6">
          Authorized access only · All actions audited
        </p>
      </div>
    </div>
  );
}
