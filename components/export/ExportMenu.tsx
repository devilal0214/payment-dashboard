'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';

interface ExportMenuProps {
  searchParams: ReadonlyURLSearchParams;
  selectedIds: number[];
}

export default function ExportMenu({ searchParams, selectedIds }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function buildExportUrl(format: 'csv' | 'xlsx', idsOnly = false): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('format', format);
    // Remove pagination params
    params.delete('page');
    params.delete('pageSize');
    params.delete('sortBy');
    params.delete('sortDir');

    if (idsOnly && selectedIds.length > 0) {
      params.set('selectedIds', selectedIds.join(','));
    }

    return `/api/tickets/export?${params.toString()}`;
  }

  async function handleExport(format: 'csv' | 'xlsx', idsOnly = false) {
    setExporting(true);
    setOpen(false);

    try {
      const url = buildExportUrl(format, idsOnly);
      const a = document.createElement('a');
      a.href = url;
      a.click();
    } finally {
      setTimeout(() => setExporting(false), 1200);
    }
  }

  return (
    <div ref={ref} className="relative select-none">
      <button
        id="export-menu-toggle"
        onClick={() => setOpen((v) => !v)}
        disabled={exporting}
        className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 text-white rounded-md
                   text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-subtle disabled:opacity-50"
      >
        {exporting ? (
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        Export
        <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white border border-zinc-200 rounded-lg shadow-dropdown animate-fade-in">
          <div className="p-2 space-y-1">
            <p className="px-3 py-1.5 text-[10px] uppercase font-mono font-semibold text-zinc-400 tracking-wider">
              Filtered Records Export
            </p>
            <button
              id="export-csv-filtered"
              onClick={() => handleExport('csv')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  CSV
                </span>
                <span>Export as CSV</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Streaming</span>
            </button>
            <button
              id="export-xlsx-filtered"
              onClick={() => handleExport('xlsx')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  XLSX
                </span>
                <span>Export as Excel</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Formatted</span>
            </button>

            {selectedIds.length > 0 && (
              <>
                <div className="my-1 border-t border-zinc-100" />
                <p className="px-3 py-1.5 text-[10px] uppercase font-mono font-semibold text-zinc-400 tracking-wider">
                  Selected Rows ({selectedIds.length})
                </p>
                <button
                  id="export-csv-selected"
                  onClick={() => handleExport('csv', true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      CSV
                    </span>
                    <span>Selected ({selectedIds.length}) as CSV</span>
                  </div>
                </button>
                <button
                  id="export-xlsx-selected"
                  onClick={() => handleExport('xlsx', true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      XLSX
                    </span>
                    <span>Selected ({selectedIds.length}) as Excel</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
