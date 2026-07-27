interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-card border border-rule bg-paper-2 p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
        {icon && (
          <span className="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-accent-muted text-accent">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
      {trend && (
        <p className={`mt-1 text-xs font-medium ${trend.positive ? "text-success" : "text-danger"}`}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </p>
      )}
    </div>
  );
}
