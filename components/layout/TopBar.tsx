'use client';

import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth/session';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  payment_manager: 'Payment Manager',
  payment_agent: 'Payment Agent',
  viewer: 'Viewer',
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
    <header className="h-12 shrink-0 bg-surface-1 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span className="font-medium text-text-primary">reports.refly.org</span>
        <span>/</span>
        <span>Payment & Claims Dashboard</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-brand-300">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-text-primary leading-tight">{user.username}</p>
            <p className="text-xs text-text-muted leading-tight">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>

        <button
          id="topbar-logout"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary
                     hover:text-text-primary hover:bg-surface-3 rounded-lg transition-colors"
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
