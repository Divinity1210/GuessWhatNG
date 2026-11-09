"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { playMenuClick } from "@/lib/audio/sound-effects";
import {
  HomeIcon,
  PlayIcon,
  TrophyIcon,
  MessageSquareIcon,
  UserIcon,
} from "@/components/ui/Icons";

const tabs = [
  { label: "Home", href: "/dashboard", Icon: HomeIcon },
  { label: "Ranks", href: "/leaderboard", Icon: TrophyIcon },
  { label: "Play", href: "/play", Icon: PlayIcon, highlight: true },
  { label: "Arena", href: "/community", Icon: MessageSquareIcon },
  { label: "Profile", href: "/profile", Icon: UserIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0b0e17]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-1.5">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

          if (tab.highlight) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => playMenuClick()}
                className="flex min-h-[58px] flex-col items-center justify-center gap-0.5 py-1.5"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-xl transition-transform duration-150 active:scale-95 ${
                    active
                      ? "gradient-brand text-white shadow-md shadow-[#F7911B]/25"
                      : "gradient-brand text-white/95"
                  }`}
                >
                  <tab.Icon className="size-4 fill-current" />
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none tracking-tight ${
                    active ? "text-accent" : "text-slate-300"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => playMenuClick()}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 py-1.5 text-[10px] transition-colors duration-150 ${
                active
                  ? "font-semibold text-accent"
                  : "font-medium text-slate-400 active:text-slate-200"
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-7 rounded-full bg-accent" />
              )}
              <tab.Icon className={`size-5 ${active ? "text-accent" : ""}`} />
              <span className="leading-none tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
