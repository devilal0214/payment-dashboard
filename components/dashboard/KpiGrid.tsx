import type { DashboardStats } from '@/lib/queries/stats';
import KpiCard from './KpiCard';

interface KpiGridProps {
  stats: DashboardStats;
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `€${(val / 1_000).toFixed(1)}K`;
  return `€${val.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KpiGrid({ stats }: KpiGridProps) {
  const cards = [
    {
      id: 'kpi-total-claims',
      label: 'Total Claims',
      value: stats.totalClaims.toLocaleString(),
      href: '/tickets',
      badgeText: 'All Records',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'kpi-open-tickets',
      label: 'Open Tickets',
      value: stats.openTickets.toLocaleString(),
      href: '/tickets?ticketStatus=open',
      badgeText: 'Active',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'kpi-finished-dashboard',
      label: 'Finished Dashboard',
      value: stats.finishedDashboard.toLocaleString(),
      href: '/tickets?dashboardCompleted=true',
      badgeText: 'Complete',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'kpi-unfinished-dashboard',
      label: 'Unfinished Dashboard',
      value: stats.unfinishedDashboard.toLocaleString(),
      href: '/tickets?dashboardCompleted=false',
      badgeText: 'Pending',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: 'kpi-need-payment',
      label: 'Need Payment Details',
      value: stats.needPaymentDetails.toLocaleString(),
      href: '/tickets?needPaymentDetails=true',
      badgeText: 'Action Req.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'kpi-need-resign',
      label: 'Need Re-Sign',
      value: stats.needResign.toLocaleString(),
      href: '/tickets?needResign=true',
      badgeText: 'Action Req.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      id: 'kpi-total-compensation',
      label: 'Total Compensation',
      value: formatCurrency(stats.totalCompensation),
      subValue: `€${stats.totalCompensation.toLocaleString()}`,
      href: '/tickets?sortBy=compensation_amount&sortDir=desc',
      badgeText: 'EUR',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'kpi-amount-received',
      label: 'Total Amount Received',
      value: formatCurrency(stats.totalAmountReceived),
      subValue: `€${stats.totalAmountReceived.toLocaleString()}`,
      href: '/tickets?sortBy=amount_received&sortDir=desc',
      badgeText: 'Collected',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'kpi-refly-source',
      label: 'ReFly Claims',
      value: (stats.reflyCount ?? 0).toLocaleString(),
      href: '/tickets?source=refly',
      badgeText: 'Source',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'kpi-skypay-source',
      label: 'SkyPay Claims',
      value: (stats.skypayCount ?? 0).toLocaleString(),
      href: '/tickets?source=skypay',
      badgeText: 'Source',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => (
        <KpiCard key={card.id} {...card} />
      ))}
    </div>
  );
}
