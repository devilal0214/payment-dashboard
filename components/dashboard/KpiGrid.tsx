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
      icon: '📋',
      color: 'indigo' as const,
    },
    {
      id: 'kpi-open-tickets',
      label: 'Open Tickets',
      value: stats.openTickets.toLocaleString(),
      icon: '🎫',
      color: 'amber' as const,
    },
    {
      id: 'kpi-finished-dashboard',
      label: 'Finished Dashboard',
      value: stats.finishedDashboard.toLocaleString(),
      icon: '✅',
      color: 'green' as const,
    },
    {
      id: 'kpi-unfinished-dashboard',
      label: 'Unfinished Dashboard',
      value: stats.unfinishedDashboard.toLocaleString(),
      icon: '⏳',
      color: 'orange' as const,
    },
    {
      id: 'kpi-need-payment',
      label: 'Need Payment Details',
      value: stats.needPaymentDetails.toLocaleString(),
      icon: '💳',
      color: 'rose' as const,
    },
    {
      id: 'kpi-need-resign',
      label: 'Need Resign',
      value: stats.needResign.toLocaleString(),
      icon: '✍️',
      color: 'purple' as const,
    },
    {
      id: 'kpi-total-compensation',
      label: 'Total Compensation',
      value: formatCurrency(stats.totalCompensation),
      icon: '💰',
      color: 'teal' as const,
    },
    {
      id: 'kpi-amount-received',
      label: 'Total Amount Received',
      value: formatCurrency(stats.totalAmountReceived),
      icon: '🏦',
      color: 'cyan' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.id} {...card} />
      ))}
    </div>
  );
}
