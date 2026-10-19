"use client";

import { useEffect, useState } from "react";
import { LIVE_FOMO_EVENTS, type LiveFomoItem } from "@/lib/game/viral-engine";
import { FlameIcon, TrophyIcon, ZapIcon, UsersIcon } from "@/components/ui/Icons";

export function LiveFomoTicker({ compact = false }: { compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LIVE_FOMO_EVENTS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const current: LiveFomoItem = LIVE_FOMO_EVENTS[activeIndex];

  const badgeConfig = {
    WIN: {
      bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: "CASH PAYOUT",
      Icon: TrophyIcon,
    },
    SPEED: {
      bg: "bg-[#F7911B]/15 text-[#F7911B] border-[#F7911B]/30",
      label: "FAST LOCK",
      Icon: ZapIcon,
    },
    TURF: {
      bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      label: "TURF WARS",
      Icon: UsersIcon,
    },
    STREAK: {
      bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      label: "HOT STREAK",
      Icon: FlameIcon,
    },
  }[current.tag];

  const Icon = badgeConfig.Icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#121622]/90 backdrop-blur-xl ${
        compact ? "px-3.5 py-2.5" : "px-4 py-3"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex size-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-400" />
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${badgeConfig.bg}`}
          >
            <Icon className="size-3" />
            <span>{badgeConfig.label}</span>
          </span>

          <p className="truncate text-xs sm:text-sm font-semibold text-white animate-fade-in" key={current.id}>
            {current.text}
            <span className="hidden md:inline text-ink-muted font-normal ml-2">
              · {current.subtext}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-ink-muted hidden sm:inline">{current.timeAgo}</span>
          <div className="flex items-center gap-1">
            {LIVE_FOMO_EVENTS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show live event ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeIndex ? "w-4 bg-[#F7911B]" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
