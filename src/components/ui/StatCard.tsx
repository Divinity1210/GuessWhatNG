interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-[#222631] bg-[#111318] p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A92A6]">{label}</p>
        {icon && (
          <span className="text-[#8A92A6]">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-[#F4F5F8] tabular-nums">{value}</p>
      {trend && (
        <p className={`mt-1 text-[11px] font-medium tabular-nums ${trend.positive ? "text-[#10B981]" : "text-[#EF4444]"}`}>
          {trend.positive ? "+" : "-"} {trend.value}
        </p>
      )}
    </div>
  );
}
