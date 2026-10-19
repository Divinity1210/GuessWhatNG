"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUpIcon,
  PlayIcon,
  TrophyIcon,
  CoinsIcon,
  UsersIcon,
} from "@/components/ui/Icons";

const tabs = [
  { label: "Home", href: "/dashboard", Icon: TrendingUpIcon },
  { label: "Arena", href: "/play", Icon: PlayIcon },
  { label: "Standings", href: "/leaderboard", Icon: TrophyIcon },
  { label: "Wallet", href: "/wallet", Icon: CoinsIcon },
  { label: "Squad", href: "/referrals", Icon: UsersIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[#222631] bg-[#090A0D]/95 backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors duration-150 ${
                active
                  ? "text-[#F7911B] font-semibold"
                  : "text-[#8A92A6] hover:text-[#F4F5F8] font-medium"
              }`}
            >
              {active && (
                <span className="absolute top-0 h-[2px] w-7 rounded-full bg-[#F7911B]" />
              )}
              <tab.Icon className="size-4.5" />
              <span className="tracking-tight leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
