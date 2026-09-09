import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="surface-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-primary" />
        </div>
      </div>
    </div>
  );
}
