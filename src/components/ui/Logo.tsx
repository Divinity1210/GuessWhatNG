import Link from "next/link";

interface LogoProps {
  variant?: "horizontal" | "vertical" | "icon" | "stacked";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export function Logo({
  variant = "horizontal",
  size = "md",
  href = "/",
  className = "",
}: LogoProps) {
  const iconSizeMap = {
    sm: 32,
    md: 40,
    lg: 52,
  };

  const px = iconSizeMap[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${variant === "vertical" ? "flex-col text-center" : ""} ${className}`}>
      {/* Official Logomark */}
      <img
        src="/logo-gw.svg"
        alt="Guess What"
        width={px}
        height={px}
        className="object-contain shrink-0"
        style={{ width: `${px}px`, height: `${px}px` }}
      />

      {variant !== "icon" && (
        <div className={`font-display font-extrabold tracking-tight leading-none text-white ${
          size === "sm" ? "text-lg" : size === "md" ? "text-xl sm:text-2xl" : "text-3xl"
        }`}>
          {variant === "stacked" ? (
            <div className="flex flex-col leading-[0.88] text-left">
              <span>Guess</span>
              <span>What</span>
            </div>
          ) : (
            <span>GuessWhat</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
        {content}
      </Link>
    );
  }

  return content;
}
