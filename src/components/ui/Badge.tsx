type BadgeVariant = "active" | "completed" | "upcoming" | "closing" | "info" | "warning" | "danger" | "success" | "neutral" | "default" | "gold";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
  completed: "bg-[#171A21] text-[#8A92A6] border-[#222631]",
  upcoming: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25",
  closing: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
  info: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25",
  warning: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
  danger: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25",
  success: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
  neutral: "bg-[#171A21] text-[#8A92A6] border-[#222631]",
  default: "bg-[#171A21] text-[#8A92A6] border-[#222631]",
  gold: "bg-[#F7911B]/12 text-[#F7911B] border-[#F7911B]/30",
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
