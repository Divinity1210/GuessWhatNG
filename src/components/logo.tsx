import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 select-none">
      <span className="grid size-9 place-items-center rounded-full bg-[var(--color-ink)] shadow-lg shadow-[oklch(77%_0.17_70_/_0.15)] transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-105">
        <Image
          src="/logo-gw.png"
          alt="Guess What logomark"
          width={26}
          height={23}
          priority
        />
      </span>
      <span className="font-display text-xl font-bold leading-none tracking-tight">
        Guess<span className="text-[var(--color-accent)]">What</span>
      </span>
    </Link>
  );
}
