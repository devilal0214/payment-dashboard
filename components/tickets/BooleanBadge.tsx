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
    <span className="badge border bg-rose-500/15 text-rose-300 border-rose-500/25 text-[11px]">
      {trueLabel}
    </span>
  ) : (
    <span className="badge border bg-surface-3 text-text-muted border-border text-[11px]">
      {falseLabel}
    </span>
  );
}
