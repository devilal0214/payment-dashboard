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
      setTimeout(() => setExporting(false), 1000);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        id="export-menu-toggle"
        onClick={() => setOpen((v) => !v)}
        disabled={exporting}
        className="flex items-center gap-2 px-3 py-2 bg-surface-3 border border-border rounded-lg
                   text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        Export
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-60 bg-surface-2 border border-border rounded-xl shadow-card-lg animate-fade-in">
          <div className="p-2 space-y-0.5">
            <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
              All Filtered Results
            </p>
            <button
              id="export-csv-filtered"
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 text-sm text-text-secondary hover:text-text-primary text-left transition-colors"
            >
              <span className="text-green-400">CSV</span>
              Export filtered as CSV
            </button>
            <button
              id="export-xlsx-filtered"
              onClick={() => handleExport('xlsx')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 text-sm text-text-secondary hover:text-text-primary text-left transition-colors"
            >
              <span className="text-teal-400">XLSX</span>
              Export filtered as Excel
            </button>

            {selectedIds.length > 0 && (
              <>
                <div className="my-1 border-t border-border" />
                <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Selected Rows ({selectedIds.length})
                </p>
                <button
                  id="export-csv-selected"
                  onClick={() => handleExport('csv', true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 text-sm text-text-secondary hover:text-text-primary text-left transition-colors"
                >
                  <span className="text-green-400">CSV</span>
                  Export selected as CSV
                </button>
                <button
                  id="export-xlsx-selected"
                  onClick={() => handleExport('xlsx', true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 text-sm text-text-secondary hover:text-text-primary text-left transition-colors"
                >
                  <span className="text-teal-400">XLSX</span>
                  Export selected as Excel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
