import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export function Logo({
  size = "md",
  href = "/",
  className = "",
}: LogoProps) {
  /* Height-based sizing — the official lockup includes icon + wordmark */
  const heightMap = {
    sm: 36,
    md: 44,
    lg: 60,
  };

  const h = heightMap[size];

  const content = (
    <img
      src="/official-logo.png"
      alt="GuessWhat"
      height={h}
      className={`object-contain shrink-0 ${className}`}
      style={{ height: `${h}px`, width: "auto" }}
    />
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
