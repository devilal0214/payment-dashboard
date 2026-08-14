interface BooleanBadgeProps {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}

export default function BooleanBadge({
  value,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: BooleanBadgeProps) {
  return value ? (
    <span className="badge bg-rose-50 text-rose-700 border-rose-200 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
      {trueLabel}
    </span>
  ) : (
    <span className="badge bg-zinc-100 text-zinc-600 border-zinc-200 font-medium">
      {falseLabel}
    </span>
  );
}
