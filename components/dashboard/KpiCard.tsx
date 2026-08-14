'use client';

import Link from 'next/link';

interface KpiCardProps {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  href: string;
  badgeText?: string;
}

export default function KpiCard({
  id,
  label,
  value,
  subValue,
  icon,
  href,
  badgeText,
}: KpiCardProps) {
  return (
    <Link
      id={id}
      href={href}
      className="group relative card p-4 flex flex-col justify-between cursor-pointer border border-zinc-200 hover:border-zinc-900 hover:shadow-card-hover transition-all duration-200 ease-out rounded-lg overflow-hidden bg-white"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center text-sm font-semibold group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
            {icon}
          </div>
          <div className="flex items-center gap-1.5">
            {badgeText && (
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                {badgeText}
              </span>
            )}
            <span className="text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-xs font-mono font-bold">
              ↗
            </span>
          </div>
        </div>
        <p className="text-2xl font-bold text-zinc-950 tracking-tight leading-tight font-mono">
          {value}
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
          {label}
        </p>
        {subValue && (
          <p className="text-[11px] text-zinc-400 font-mono">
            {subValue}
          </p>
        )}
      </div>
    </Link>
  );
}
