import Link from "next/link";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg";
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
    xs: 42,   // navbar / tight header
    sm: 52,   // sidebar
    md: 72,   // standard display
    lg: 96,   // hero / auth pages
  };

  const h = heightMap[size];

  const content = (
    <img
      src="/gw-logo.png"
      alt="GuessWhat"
      height={h}
      className={`object-contain shrink-0 ${className}`}
      style={{
        height: `${h}px`,
        width: "auto",
      }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
