import Link from "next/link";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

interface ButtonProps extends ButtonBaseProps, React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: undefined;
}

interface LinkButtonProps extends ButtonBaseProps {
  href: string;
}

type Props = ButtonProps | LinkButtonProps;

const variantStyles: Record<Variant, string> = {
  primary:
    "gradient-brand text-white font-semibold shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "bg-paper-3 text-ink border border-rule hover:bg-paper-4 hover:border-rule-2",
  outline:
    "border border-rule bg-transparent text-ink-2 hover:border-accent hover:text-ink",
  ghost:
    "bg-transparent text-ink-3 hover:bg-surface-boost hover:text-ink",
  danger:
    "bg-danger/15 text-danger border border-danger/25 hover:bg-danger/25",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-sm rounded-[var(--radius-sm)]",
  md: "px-5 py-2.5 text-sm rounded-[var(--radius-sm)] font-medium",
  lg: "px-8 py-3.5 text-base rounded-[var(--radius-md)] font-bold font-display",
};

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }: Props) {
  const classes = `inline-flex items-center justify-center gap-2 transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
