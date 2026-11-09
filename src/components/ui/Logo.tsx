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
  /* Height-based sizing (official horizontal lockup 463x189) */
  const heightMap = {
    xs: 36,   // mobile top bar / compact navbar
    sm: 46,   // desktop sidebar
    md: 68,   // standard display
    lg: 88,   // hero / auth pages
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
