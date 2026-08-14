// Status badge color maps
const CLAIM_STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-500/15 text-blue-300 border-blue-500/25',
  pending:     'bg-amber-500/15 text-amber-300 border-amber-500/25',
  solved:      'bg-green-500/15 text-green-300 border-green-500/25',
  closed:      'bg-surface-4 text-text-muted border-border',
  delayed:     'bg-orange-500/15 text-orange-300 border-orange-500/25',
  cancelled:   'bg-red-500/15 text-red-300 border-red-500/25',
  accepted:    'bg-teal-500/15 text-teal-300 border-teal-500/25',
  rejected:    'bg-rose-500/15 text-rose-300 border-rose-500/25',
  'in-progress':'bg-purple-500/15 text-purple-300 border-purple-500/25',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-500/15 text-blue-300 border-blue-500/25',
  pending:     'bg-amber-500/15 text-amber-300 border-amber-500/25',
  solved:      'bg-green-500/15 text-green-300 border-green-500/25',
  closed:      'bg-surface-4 text-text-muted border-border',
  'on-hold':   'bg-orange-500/15 text-orange-300 border-orange-500/25',
  new:         'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
};

const DASHBOARD_STATUS_COLORS: Record<string, string> = {
  completed:   'bg-green-500/15 text-green-300 border-green-500/25',
  incomplete:  'bg-amber-500/15 text-amber-300 border-amber-500/25',
  pending:     'bg-blue-500/15 text-blue-300 border-blue-500/25',
  none:        'bg-surface-4 text-text-muted border-border',
};

const SOURCE_COLORS: Record<string, string> = {
  refly:       'bg-brand-500/15 text-brand-300 border-brand-500/25',
  web:         'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  facebook:    'bg-blue-600/15 text-blue-300 border-blue-600/25',
  google:      'bg-green-500/15 text-green-300 border-green-500/25',
  email:       'bg-purple-500/15 text-purple-300 border-purple-500/25',
};

const DEFAULT_COLOR = 'bg-surface-3 text-text-secondary border-border';

type BadgeType = 'claim' | 'ticket' | 'dashboard' | 'source';

const COLOR_MAP: Record<BadgeType, Record<string, string>> = {
  claim: CLAIM_STATUS_COLORS,
  ticket: TICKET_STATUS_COLORS,
  dashboard: DASHBOARD_STATUS_COLORS,
  source: SOURCE_COLORS,
};

interface StatusBadgeProps {
  type: BadgeType;
  value: string;
}

export default function StatusBadge({ type, value }: StatusBadgeProps) {
  if (!value) return <span className="text-xs text-text-muted">—</span>;

  const map = COLOR_MAP[type];
  const key = value.toLowerCase().replace(/\s+/g, '-');
  const colorClass = map[key] ?? DEFAULT_COLOR;

  return (
    <span className={`badge border text-[11px] ${colorClass}`}>
      {value}
    </span>
  );
}
