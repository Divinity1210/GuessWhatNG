import Link from "next/link";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

interface ButtonProps extends ButtonBaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  href?: undefined;
}

interface LinkButtonProps extends ButtonBaseProps {
  href: string;
}

type Props = ButtonProps | LinkButtonProps;

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[#F7911B] text-[#090A0D] font-semibold hover:bg-[#FFA236] active:translate-y-[0.5px]",
  secondary:
    "bg-[#171A21] text-[#F4F5F8] border border-[#222631] hover:bg-[#1F242D] hover:border-[#2E3442]",
  outline:
    "border border-[#222631] bg-transparent text-[#C8CDD8] hover:border-[#F7911B] hover:text-[#F4F5F8]",
  ghost:
    "bg-transparent text-[#8A92A6] hover:bg-white/[0.04] hover:text-[#F4F5F8]",
  danger:
    "bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/25 hover:bg-[#EF4444]/20",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg font-medium",
  md: "px-4 py-2.5 text-sm rounded-lg font-semibold",
  lg: "px-6 py-3 text-sm rounded-lg font-semibold tracking-tight",
};

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }: Props) {
  const classes = `inline-flex items-center justify-center gap-2 transition-colors duration-150 select-none disabled:opacity-45 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

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
