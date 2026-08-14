'use client';

import Link from 'next/link';
import type { FullDashboardData, ChartCategoryItem } from '@/lib/queries/stats';

interface ReportChartsProps {
  charts: FullDashboardData['charts'];
  freshness?: FullDashboardData['freshness'];
}

function formatAmount(num?: number): string {
  if (!num) return '€0';
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${num.toLocaleString()}`;
}

export default function ReportCharts({ charts, freshness }: ReportChartsProps) {
  const maxAirlineCount = Math.max(...(charts.topAirlines.map((a) => a.count) || [1]), 1);
  const maxCountryCount = Math.max(...(charts.topDepartureCountries.map((c) => c.count) || [1]), 1);
  const maxMonthCount = Math.max(...(charts.ticketsOverTime.map((m) => m.count) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* ── Section Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-zinc-200">
        <div>
          <h2 className="text-base font-bold text-zinc-950 tracking-tight">Analytics & Distribution</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Interactive metrics aggregated across database. Click any segment to view filtered claim records.
          </p>
        </div>
        {freshness && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 bg-white px-3 py-1.5 rounded-md border border-zinc-200">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
            <span className="text-zinc-300">|</span>
            <span>Last DB Record: #{freshness.maxId.toLocaleString()}</span>
            {freshness.lastUpdated && (
              <>
                <span className="text-zinc-300">|</span>
                <span>Updated: {freshness.lastUpdated.slice(0, 16).replace('T', ' ')}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── 1. Tickets over Time Trend Chart ────────────────── */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Monthly Claim Volume</h3>
              <p className="text-xs text-zinc-500">Requested claims aggregated by month</p>
            </div>
            <Link
              href="/tickets"
              className="text-xs font-mono text-zinc-500 hover:text-zinc-950 transition-colors inline-flex items-center gap-1"
            >
              View All ↗
            </Link>
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 pt-4 pb-1 border-b border-zinc-100">
            {charts.ticketsOverTime.map((item) => {
              const heightPct = Math.max(Math.round((item.count / maxMonthCount) * 100), 6);
              return (
                <Link
                  key={item.month}
                  href={`/tickets?requestedDateFrom=${item.month}-01&requestedDateTo=${item.month}-31`}
                  className="group flex-1 flex flex-col items-center gap-1 h-full justify-end"
                  title={`${item.month}: ${item.count.toLocaleString()} claims`}
                >
                  <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count >= 1000 ? `${(item.count / 1000).toFixed(0)}k` : item.count}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-zinc-900 group-hover:bg-zinc-700 rounded-t transition-all duration-150 relative"
                  />
                  <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-950 mt-1 truncate max-w-full">
                    {item.month.slice(5)}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-2">
            <span>Older</span>
            <span>Interactive Monthly Bars — Click bar to filter</span>
            <span>Recent</span>
          </div>
        </div>

        {/* ── 2. Top Airlines Distribution ────────────────────── */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Top Airlines by Volume</h3>
              <p className="text-xs text-zinc-500">Highest volume carriers & total compensation</p>
            </div>
            <Link
              href="/tickets"
              className="text-xs font-mono text-zinc-500 hover:text-zinc-950 transition-colors inline-flex items-center gap-1"
            >
              All Carriers ↗
            </Link>
          </div>

          <div className="space-y-2.5">
            {charts.topAirlines.slice(0, 6).map((item) => {
              const widthPct = Math.max(Math.round((item.count / maxAirlineCount) * 100), 4);
              return (
                <Link
                  key={item.name}
                  href={`/tickets?airline=${encodeURIComponent(item.name)}`}
                  className="group block p-2 rounded-md hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-900 group-hover:text-zinc-950 truncate max-w-[200px]">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3 text-right">
                      <span className="font-mono text-zinc-500">{item.count.toLocaleString()} claims</span>
                      {item.amount != null && item.amount > 0 && (
                        <span className="font-mono text-xs font-medium text-zinc-900">
                          {formatAmount(item.amount)}
                        </span>
                      )}
                      <span className="text-zinc-400 group-hover:text-zinc-900 transition-colors font-mono">↗</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="h-full bg-zinc-900 group-hover:bg-zinc-700 transition-all rounded-full"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── 3. Ticket Status Breakdown ──────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Ticket Status Breakdown</h3>
              <p className="text-xs text-zinc-500">Current ticket state distribution</p>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Click status to filter</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {charts.ticketsByStatus.map((item) => (
              <Link
                key={item.name}
                href={`/tickets?ticketStatus=${encodeURIComponent(item.name)}`}
                className="group p-3 rounded-md border border-zinc-200 hover:border-zinc-900 bg-zinc-50/50 hover:bg-white transition-all flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-zinc-500 block">
                    {item.name}
                  </span>
                  <span className="text-lg font-bold text-zinc-950 font-mono leading-tight">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <span className="text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-0.5 transition-all text-xs font-mono">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── 4. Claims by Source & Country Breakdown ──────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Source Channels & Country</h3>
              <p className="text-xs text-zinc-500">Claim intake sources & top departure countries</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sources */}
            <div>
              <span className="text-[11px] uppercase font-semibold text-zinc-400 tracking-wider block mb-2">
                Acquisition Channel
              </span>
              <div className="flex flex-wrap gap-2">
                {charts.claimsBySource.map((item) => (
                  <Link
                    key={item.name}
                    href={`/tickets?source=${encodeURIComponent(item.name)}`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-900 bg-white hover:bg-zinc-900 text-zinc-900 hover:text-white transition-all text-xs"
                  >
                    <span className="font-semibold uppercase tracking-wider">{item.name}</span>
                    <span className="font-mono text-zinc-500 group-hover:text-zinc-300">
                      ({item.count.toLocaleString()})
                    </span>
                    <span className="font-mono text-[10px] opacity-60">↗</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Countries */}
            <div className="pt-3 border-t border-zinc-100">
              <span className="text-[11px] uppercase font-semibold text-zinc-400 tracking-wider block mb-2">
                Top Departure Countries
              </span>
              <div className="grid grid-cols-4 gap-2">
                {charts.topDepartureCountries.slice(0, 4).map((item) => (
                  <Link
                    key={item.name}
                    href={`/tickets?departureCountry=${encodeURIComponent(item.name)}`}
                    className="group p-2.5 rounded border border-zinc-200 hover:border-zinc-900 bg-white transition-colors text-center"
                  >
                    <span className="font-mono font-bold text-sm text-zinc-950 block">
                      {item.name}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-950">
                      {item.count.toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
