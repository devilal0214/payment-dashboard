'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { triggerNavigationProgress } from './NavigationProgress';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Claims Console',
    href: '/tickets',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleLinkClick = (href: string) => {
    if (pathname !== href) {
      setPendingHref(href);
      triggerNavigationProgress();
    }
  };

  return (
    <aside className="w-56 shrink-0 bg-zinc-950 text-white border-r border-zinc-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-white text-zinc-950 flex items-center justify-center font-bold text-xs font-mono shadow-subtle shrink-0">
            RF
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-wide uppercase leading-none">ReFly</p>
            <p className="text-[10px] text-zinc-400 font-mono leading-none mt-1">Payment Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1">
        <p className="px-3 py-1.5 text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-widest">
          Main Console
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const isPending = pendingHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleLinkClick(item.href)}
              aria-current={isActive ? 'page' : undefined}
              className={`sidebar-link relative ${isActive ? 'active' : ''} ${isPending ? 'bg-zinc-800/60 text-white' : ''}`}
            >
              <span className={isActive || isPending ? 'text-white' : 'text-zinc-400'}>
                {isPending ? (
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  item.icon
                )}
              </span>
              <span className="flex-1">{item.label}</span>
              {isPending && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Footer */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950">
        <div className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            READ-ONLY
          </span>
          <span className="text-zinc-500">v1.0</span>
        </div>
      </div>
    </aside>
  );
}
