type BadgeVariant = "active" | "completed" | "upcoming" | "closing" | "info" | "warning" | "danger" | "success" | "neutral";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-success/15 text-success border-success/25",
  completed: "bg-accent-purple-soft text-accent-purple border-accent-purple/25",
  upcoming: "bg-info/15 text-info border-info/25",
  closing: "bg-warning/15 text-warning border-warning/25",
  info: "bg-info/15 text-info border-info/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  danger: "bg-danger/15 text-danger border-danger/25",
  success: "bg-success/15 text-success border-success/25",
  neutral: "bg-surface-boost text-ink-3 border-rule",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className = "", dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
