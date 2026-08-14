'use client';

import { useState, useRef, useEffect } from 'react';
import type { Table } from '@tanstack/react-table';
import type { TicketRow } from '@/lib/queries/tickets';

interface ColumnVisibilityMenuProps {
  table: Table<TicketRow>;
  onResetDefaults?: () => void;
}

const STORAGE_KEY = 'refly_payment_dashboard_columns_v1';

export default function ColumnVisibilityMenu({ table, onResetDefaults }: ColumnVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const columns = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const visibleCount = columns.filter((c) => c.getIsVisible()).length;

  // Filter columns by user search input
  const filteredColumns = columns.filter((c) => {
    const headerStr = String(c.columnDef.header || c.id).toLowerCase();
    return headerStr.includes(search.toLowerCase());
  });

  return (
    <div ref={ref} className="relative select-none">
      <button
        id="column-visibility-toggle"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-300 rounded-md
                   text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:border-zinc-900 transition-colors shadow-subtle"
      >
        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Columns <span className="font-mono text-zinc-400 font-normal">({visibleCount}/{columns.length})</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white border border-zinc-200 rounded-lg shadow-dropdown animate-fade-in">
          <div className="p-3 space-y-2.5">
            {/* Header & Quick actions */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
                Payment Team Columns ({visibleCount}/{columns.length})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => table.toggleAllColumnsVisible(true)}
                  className="text-xs font-semibold text-zinc-900 hover:underline"
                >All</button>
                <span className="text-zinc-300">·</span>
                <button
                  onClick={() => {
                    if (onResetDefaults) onResetDefaults();
                    else table.toggleAllColumnsVisible(false);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >Reset</button>
              </div>
            </div>

            {/* Filter Search Input */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 59 columns..."
              className="input-base py-1 px-2.5 text-xs font-mono"
            />

            {/* Column Checklist */}
            <div className="space-y-0.5 max-h-72 overflow-y-auto pt-1">
              {filteredColumns.map((col) => (
                <label
                  key={col.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-3.5 h-3.5"
                    />
                    <span className="text-xs font-medium text-zinc-800">{String(col.columnDef.header)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">{col.id}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
