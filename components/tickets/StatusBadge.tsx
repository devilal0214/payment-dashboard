// Status badge color maps with high-contrast, clean monochrome & muted fintech tones
const CLAIM_STATUS_COLORS: Record<string, string> = {
  open:         'bg-blue-50 text-blue-700 border-blue-200',
  pending:      'bg-amber-50 text-amber-800 border-amber-200',
  solved:       'bg-emerald-50 text-emerald-800 border-emerald-200',
  closed:       'bg-zinc-100 text-zinc-600 border-zinc-200',
  delayed:      'bg-orange-50 text-orange-800 border-orange-200',
  cancelled:    'bg-rose-50 text-rose-800 border-rose-200',
  accepted:     'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected:     'bg-rose-50 text-rose-800 border-rose-200',
  'in-progress':'bg-violet-50 text-violet-800 border-violet-200',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-50 text-blue-700 border-blue-200',
  pending:     'bg-amber-50 text-amber-800 border-amber-200',
  solved:      'bg-emerald-50 text-emerald-800 border-emerald-200',
  closed:      'bg-zinc-100 text-zinc-600 border-zinc-200',
  'on-hold':   'bg-orange-50 text-orange-800 border-orange-200',
  new:         'bg-sky-50 text-sky-700 border-sky-200',
};

const DASHBOARD_STATUS_COLORS: Record<string, string> = {
  completed:   'bg-emerald-50 text-emerald-800 border-emerald-200',
  incomplete:  'bg-amber-50 text-amber-800 border-amber-200',
  pending:     'bg-blue-50 text-blue-700 border-blue-200',
  none:        'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const SOURCE_COLORS: Record<string, string> = {
  refly:       'bg-zinc-900 text-white border-zinc-900 font-semibold',
  skypay:      'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
  web:         'bg-zinc-100 text-zinc-800 border-zinc-300',
  facebook:    'bg-blue-50 text-blue-800 border-blue-200',
  google:      'bg-emerald-50 text-emerald-800 border-emerald-200',
  email:       'bg-slate-100 text-slate-800 border-slate-300',
};

const DEFAULT_COLOR = 'bg-zinc-100 text-zinc-700 border-zinc-200';

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
  if (!value) return <span className="text-xs text-zinc-400">—</span>;

  const map = COLOR_MAP[type];
  const key = value.toLowerCase().replace(/\s+/g, '-');
  const colorClass = map[key] ?? DEFAULT_COLOR;

  return (
    <span className={`badge ${colorClass}`}>
      {value}
    </span>
  );
}
