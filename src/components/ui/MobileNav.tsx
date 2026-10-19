"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUpIcon,
  PlayIcon,
  TrophyIcon,
  CoinsIcon,
  TargetIcon,
} from "@/components/ui/Icons";

const tabs = [
  { label: "Home", href: "/dashboard", Icon: TrendingUpIcon },
  { label: "Play", href: "/play", Icon: PlayIcon, highlight: true },
  { label: "Ranks", href: "/leaderboard", Icon: TrophyIcon },
  { label: "Wallet", href: "/wallet", Icon: CoinsIcon },
  { label: "Profile", href: "/profile", Icon: TargetIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 md:hidden pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-md rounded-full border border-white/10 bg-[#0c0f18]/85 p-1.5 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around relative">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

            if (tab.highlight) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative -top-5 flex flex-col items-center group"
                >
                  <div className="size-14 rounded-full bg-gradient-to-tr from-accent via-purple-600 to-amber-400 p-0.5 shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform duration-200">
                    <div className="w-full h-full rounded-full bg-[#0c0f18] flex items-center justify-center text-white">
                      <tab.Icon className="size-6 fill-current text-accent" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tracking-tight text-accent mt-0.5">
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-all duration-200 rounded-2xl ${
                  active
                    ? "text-accent font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {active && (
                  <div className="absolute inset-0 rounded-2xl bg-accent-muted/40 border border-accent/30 -z-10" />
                )}
                <tab.Icon className={`size-5 ${active ? "text-accent scale-110" : ""}`} />
                <span className="tracking-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
