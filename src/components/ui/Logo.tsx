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
  const heightMap = {
    xs: 34,
    sm: 40,
    md: 56,
    lg: 76,
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
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
