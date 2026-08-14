'use client';

import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth/session';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  payment_manager: 'Payment Manager',
  payment_agent: 'Payment Agent',
  viewer: 'Viewer (Read-Only)',
};

interface TopBarProps {
  user: SessionUser;
}

export default function TopBar({ user }: TopBarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-12 shrink-0 bg-white border-b border-zinc-200 flex items-center justify-between px-5 select-none z-20">
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
        <span className="font-semibold text-zinc-900">reports.refly.org</span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-600">Payment & Claims Reporting</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-zinc-900 text-white flex items-center justify-center text-xs font-mono font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-zinc-950 leading-tight">{user.username}</p>
            <p className="text-[10px] font-mono text-zinc-500 leading-tight">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

        <button
          id="topbar-logout"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-600
                     hover:text-zinc-950 hover:bg-zinc-100 rounded border border-transparent hover:border-zinc-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </header>
  );
}
