"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUpIcon,
  PlayIcon,
  TrophyIcon,
  TargetIcon,
} from "@/components/ui/Icons";

const tabs = [
  { label: "Home", href: "/dashboard", Icon: TrendingUpIcon },
  { label: "Play", href: "/play", Icon: PlayIcon, highlight: true },
  { label: "Leaderboard", href: "/leaderboard", Icon: TrophyIcon },
  { label: "Profile", href: "/profile", Icon: TargetIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 md:hidden pointer-events-none">
      <nav
        aria-label="Mobile navigation"
        className="pointer-events-auto mx-auto max-w-sm rounded-full border border-white/10 bg-[#0c0f18]/90 px-2 py-1.5 backdrop-blur-xl shadow-2xl"
      >
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
                  className="relative -top-4 flex flex-col items-center group"
                >
                  <div className="size-13 rounded-full bg-gradient-to-r from-[#FF0400] to-[#F7911B] flex items-center justify-center text-white shadow-lg shadow-[#F7911B]/25 group-hover:scale-105 transition-transform duration-200">
                    <tab.Icon className="size-5 fill-current" />
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
                className={`relative flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-colors duration-200 rounded-2xl ${
                  active
                    ? "text-accent font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <tab.Icon className={`size-5 ${active ? "text-accent" : ""}`} />
                <span className="tracking-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
