interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  size?: "sm" | "md";
}

export function ProgressBar({ value, className = "", size = "sm" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className={`overflow-hidden rounded-[var(--radius-pill)] bg-paper-3 ${height} ${className}`}>
      <div
        className={`gradient-brand ${height} rounded-[var(--radius-pill)] transition-all duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
