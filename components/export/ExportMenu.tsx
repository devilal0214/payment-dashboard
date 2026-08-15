'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { ExportJobMeta } from '@/lib/export/export-job-manager';

interface ExportMenuProps {
  searchParams: ReadonlyURLSearchParams;
  selectedIds: number[];
}

export default function ExportMenu({ searchParams, selectedIds }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<ExportJobMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Poll active export job progress
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/tickets/export/jobs/${activeJob.jobId}`);
        if (res.ok) {
          const updated: ExportJobMeta = await res.json();
          setActiveJob(updated);
        }
      } catch { /* ignore poll network glitches */ }
    }, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeJob]);

  async function startExport(format: 'xlsx' | 'csv', useSelectedOnly = false) {
    if (starting) return; // Prevent duplicate clicks
    setStarting(true);
    setStartError('');
    setOpen(false);
    setModalOpen(true);

    // Initial placeholder status
    setActiveJob({
      jobId: 'initializing...',
      userId: '',
      format,
      status: 'queued',
      processedRows: 0,
      totalRows: 0,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
    });

    const filters: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (!['page', 'pageSize', 'sortBy', 'sortDir'].includes(key)) {
        filters[key] = val;
      }
    });

    try {
      const res = await fetch('/api/tickets/export/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filters,
          selectedIds: useSelectedOnly ? selectedIds : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate export process');
      }

      setActiveJob(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start export';
      setStartError(msg);
      setActiveJob((prev) => prev ? { ...prev, status: 'failed', error: msg } : null);
    } finally {
      setStarting(false);
    }
  }

  // Non-navigating programmatic download to prevent page error boundaries
  function downloadExportFile(url: string) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    }, 60000);
  }

  function formatBytes(bytes?: number): string {
    if (!bytes) return '';
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return (
    <>
      <div ref={ref} className="relative select-none">
        <button
          id="export-menu-toggle"
          onClick={() => setOpen((v) => !v)}
          disabled={starting}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-md
                     text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-subtle disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
          {activeJob && activeJob.status === 'processing' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white border border-zinc-200 rounded-lg shadow-dropdown animate-fade-in">
            <div className="p-2 space-y-1">
              <p className="px-3 py-1 text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                Full Database & Filtered Export
              </p>

              {/* Full XLSX Export */}
              <button
                id="export-xlsx-full"
                onClick={() => startExport('xlsx')}
                disabled={starting}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    XLSX
                  </span>
                  <span>Full Excel Export (ZIP)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">50k/part</span>
              </button>

              {/* Full CSV Export */}
              <button
                id="export-csv-full"
                onClick={() => startExport('csv')}
                disabled={starting}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    CSV
                  </span>
                  <span>Full CSV Export</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold">Fastest</span>
              </button>

              {selectedIds.length > 0 && (
                <>
                  <div className="my-1 border-t border-zinc-100" />
                  <p className="px-3 py-1 text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Selected Rows ({selectedIds.length})
                  </p>
                  <button
                    id="export-xlsx-selected"
                    onClick={() => startExport('xlsx', true)}
                    disabled={starting}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors disabled:opacity-50"
                  >
                    <span>Selected ({selectedIds.length}) as Excel</span>
                  </button>
                  <button
                    id="export-csv-selected"
                    onClick={() => startExport('csv', true)}
                    disabled={starting}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-100 text-xs font-medium text-zinc-800 text-left transition-colors disabled:opacity-50"
                  >
                    <span>Selected ({selectedIds.length}) as CSV</span>
                  </button>
                </>
              )}

              {activeJob && (
                <>
                  <div className="my-1 border-t border-zinc-100" />
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-full text-center px-3 py-1.5 text-xs font-mono font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"
                  >
                    View Active Export Progress →
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Progress & Download Modal */}
      {modalOpen && activeJob && (
        <>
          <div className="drawer-overlay" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] max-w-[92vw] bg-white border border-zinc-200 rounded-lg shadow-dropdown z-50 p-6 space-y-4 animate-fade-in select-none">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-950">Exporting Payment Report</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    activeJob.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : activeJob.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                  }`}>
                    {activeJob.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">Job ID: {activeJob.jobId}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-950 font-mono text-sm">
                ✕
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-600">
                  Processed: <strong className="text-zinc-950">{activeJob.processedRows.toLocaleString()}</strong> / {activeJob.totalRows ? activeJob.totalRows.toLocaleString() : '—'}
                </span>
                <span className="font-bold text-zinc-950">{activeJob.progressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <div
                  style={{ width: `${activeJob.progressPercent}%` }}
                  className={`h-full transition-all duration-300 rounded-full ${
                    activeJob.status === 'completed' ? 'bg-emerald-600' : 'bg-zinc-900'
                  }`}
                />
              </div>
            </div>

            {/* Status Messages */}
            {activeJob.status === 'queued' && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-600 font-mono flex items-center gap-2">
                <svg className="animate-spin w-4 h-4 text-zinc-900 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Preparing background export task...
              </div>
            )}

            {activeJob.status === 'processing' && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-600 font-mono flex items-center gap-2">
                <svg className="animate-spin w-4 h-4 text-zinc-900 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Streaming keyset SQL chunks into 50,000-row XLSX worksheets...
              </div>
            )}

            {activeJob.status === 'completed' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 font-mono">
                  ✓ Export completed successfully! File is ready for download.
                  {activeJob.fileSizeBytes && (
                    <span className="block mt-1 font-bold text-emerald-800">
                      File Size: {formatBytes(activeJob.fileSizeBytes)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => downloadExportFile(`/api/tickets/export/download/${activeJob.jobId}`)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded text-xs transition-colors shadow-subtle"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download {activeJob.format === 'csv' ? 'CSV Report' : 'ZIP Archive'}
                </button>
              </div>
            )}

            {activeJob.status === 'failed' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-mono">
                ✖ Export failed: {activeJob.error || startError || 'Export process could not complete. Please try again.'}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
