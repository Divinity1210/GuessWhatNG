"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUpIcon, PlayIcon, TrophyIcon, CoinsIcon, ZapIcon } from "@/components/ui/Icons";

const tabs = [
  { label: "Home", href: "/dashboard", Icon: TrendingUpIcon },
  { label: "Play", href: "/play", Icon: PlayIcon },
  { label: "Board", href: "/leaderboard", Icon: TrophyIcon },
  { label: "Wallet", href: "/wallet", Icon: CoinsIcon },
  { label: "Menu", href: "/settings", Icon: ZapIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-paper-2/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around py-1.5">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                active ? "text-accent" : "text-ink-muted hover:text-ink-3"
              }`}
            >
              <tab.Icon className="size-5" />
              <span className={active ? "font-semibold" : ""}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
