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
  /* Height-based sizing — the official lockup is 463×189 (wide horizontal) */
  const heightMap = {
    sm: 72,
    md: 88,
    lg: 110,
  };

  const h = heightMap[size];

  const content = (
    <img
      src="/official-logo.png"
      alt="GuessWhat"
      height={h}
      className={`object-contain shrink-0 ${className}`}
      style={{
        height: `${h}px`,
        width: "auto",
        mixBlendMode: "screen",
      }}
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
