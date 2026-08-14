type CardColor = 'indigo' | 'amber' | 'green' | 'orange' | 'rose' | 'purple' | 'teal' | 'cyan';

const COLOR_MAP: Record<CardColor, { bg: string; text: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-400',   border: 'border-green-500/20' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20' },
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20' },
};

interface KpiCardProps {
  id: string;
  label: string;
  value: string;
  icon: string;
  color: CardColor;
}

export default function KpiCard({ id, label, value, icon, color }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      id={id}
      className={`card p-4 border ${c.border} hover:shadow-card-lg transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center text-lg`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.text} leading-tight`}>{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}
