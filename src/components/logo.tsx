import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 select-none">
      <span className="gradient-brand grid size-9 place-items-center rounded-full font-display text-lg font-extrabold italic text-white shadow-lg shadow-brand-orange/30">
        gw
      </span>
      <span className="font-display text-xl font-bold leading-none">
        Guess<span className="text-brand-orange">What</span>
      </span>
    </Link>
  );
}
