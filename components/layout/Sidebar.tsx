'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <span className={isActive ? 'text-white' : 'text-zinc-400'}>{item.icon}</span>
              <span>{item.label}</span>
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
