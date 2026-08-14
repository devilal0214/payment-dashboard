import type { Metadata } from 'next';
import Link from 'next/link';
import { getDashboardData } from '@/lib/queries/stats';
import KpiGrid from '@/components/dashboard/KpiGrid';
import ReportCharts from '@/components/dashboard/ReportCharts';

export const metadata: Metadata = { title: 'Dashboard — ReFly Payment Reports' };

// Force dynamic rendering per request so build time doesn't require live DB connection
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  let dashboardData;
  let error = false;

  try {
    dashboardData = await getDashboardData();
  } catch (err) {
    console.error('[DashboardPage] Error loading dashboard data:', err);
    error = true;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Payment & Claims Dashboard</h1>
            <span className="px-2 py-0.5 text-[11px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 rounded">
              v1.0 Read-Only
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time analytics and financial metrics for 1.8M+ claim records
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800
                       text-white rounded-md text-xs font-semibold shadow-subtle transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Browse Claims Table
            <span className="font-mono text-zinc-400">→</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card p-8 text-center text-zinc-500">
          <p className="text-sm font-medium text-rose-600">Failed to load dashboard statistics.</p>
          <p className="text-xs text-zinc-400 mt-1">Please refresh the page or check database connectivity.</p>
        </div>
      ) : dashboardData ? (
        <>
          {/* KPI Cards Grid */}
          <KpiGrid stats={dashboardData.stats} />

          {/* Interactive Reports & Charts Section */}
          <ReportCharts charts={dashboardData.charts} freshness={dashboardData.freshness} />

          {/* Quick Nav Footer Banner */}
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3 bg-zinc-900 text-white border-zinc-900 shadow-card">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Need granular claim search or export?</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Access advanced 30+ server-side filters, column visibility, and streaming CSV/XLSX exports.
              </p>
            </div>
            <Link
              href="/tickets"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100
                         text-zinc-950 rounded-md text-xs font-bold transition-all shrink-0"
            >
              Open Claims Console
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
