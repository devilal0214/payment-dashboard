'use client';

import { useState, useRef, useEffect } from 'react';
import type { Table } from '@tanstack/react-table';
import type { TicketRow } from '@/lib/queries/tickets';

interface ColumnVisibilityMenuProps {
  table: Table<TicketRow>;
}

export default function ColumnVisibilityMenu({ table }: ColumnVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        id="column-visibility-toggle"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-surface-3 border border-border rounded-lg
                   text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Columns <span className="text-xs text-text-muted">({visibleCount}/{columns.length})</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-surface-2 border border-border rounded-xl shadow-card-lg animate-fade-in">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-text-secondary">Columns</span>
              <div className="flex gap-2">
                <button
                  onClick={() => table.toggleAllColumnsVisible(true)}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >All</button>
                <span className="text-text-muted">·</span>
                <button
                  onClick={() => table.toggleAllColumnsVisible(false)}
                  className="text-xs text-text-muted hover:text-text-secondary"
                >None</button>
              </div>
            </div>
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {columns.map((col) => (
                <label
                  key={col.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    className="rounded border-border bg-surface-3 text-brand-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-text-secondary">{String(col.columnDef.header)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
