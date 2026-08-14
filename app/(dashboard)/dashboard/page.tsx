import type { Metadata } from 'next';
import { getDashboardStats } from '@/lib/queries/stats';
import KpiGrid from '@/components/dashboard/KpiGrid';

export const metadata: Metadata = { title: 'Dashboard' };

// Revalidate every 60 seconds for near-real-time KPIs
export const revalidate = 60;

export default async function DashboardPage() {
  let stats;
  let error = false;

  try {
    stats = await getDashboardStats();
  } catch {
    error = true;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Payment Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Overview of all claims and payment activity
        </p>
      </div>

      {error ? (
        <div className="card p-6 text-center text-text-secondary">
          <p className="text-sm">Failed to load dashboard statistics. Please refresh.</p>
        </div>
      ) : (
        <KpiGrid stats={stats!} />
      )}

      {/* Quick link to tickets */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Claims Table</h2>
          <p className="text-xs text-text-secondary mt-0.5">Browse, filter, and export all claim records</p>
        </div>
        <a
          href="/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700
                     text-white rounded-lg text-sm font-medium transition-colors"
        >
          View All Claims
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}
