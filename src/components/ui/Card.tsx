interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = "", glow = false, gradient = false }: CardProps) {
  if (gradient) {
    return (
      <div className="gradient-border">
        <div className={`p-6 ${className}`}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`${glow ? "card-glow" : "rounded-card border border-rule bg-paper-2"} ${className}`}
    >
      {glow ? <div className={`relative z-10 p-6 ${className}`}>{children}</div> : children}
    </div>
  );
}
