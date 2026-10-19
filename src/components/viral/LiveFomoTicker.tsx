"use client";

import { useEffect, useState } from "react";
import { LIVE_FOMO_EVENTS, type LiveFomoItem } from "@/lib/game/viral-engine";

export function LiveFomoTicker({ compact = false }: { compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LIVE_FOMO_EVENTS.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const current: LiveFomoItem = LIVE_FOMO_EVENTS[activeIndex];

  const badgeConfig = {
    WIN: {
      style: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
      label: "SETTLED",
    },
    SPEED: {
      style: "bg-[#F7911B]/12 text-[#F7911B] border-[#F7911B]/30",
      label: "LOCK",
    },
    TURF: {
      style: "bg-[#171A21] text-[#C8CDD8] border-[#2E3442]",
      label: "DIVISION",
    },
    STREAK: {
      style: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
      label: "STREAK",
    },
  }[current.tag];

  return (
    <div
      className={`rounded-lg border border-[#222631] bg-[#111318] ${
        compact ? "px-3 py-2" : "px-3.5 py-2.5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-1.5 rounded-full bg-[#10B981] shrink-0" />

          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0 ${badgeConfig.style}`}
          >
            {badgeConfig.label}
          </span>

          <p
            className="truncate text-xs font-medium text-[#F4F5F8] animate-fade-in"
            key={current.id}
          >
            {current.text}
            <span className="hidden md:inline text-[#8A92A6] font-normal ml-2">
              — {current.subtext}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-[11px] text-[#5E6678] hidden sm:inline tabular-nums">
            {current.timeAgo}
          </span>
          <div className="flex items-center gap-1">
            {LIVE_FOMO_EVENTS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Feed item ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1 rounded-full transition-all ${
                  idx === activeIndex ? "w-3.5 bg-[#F7911B]" : "w-1 bg-[#2E3442]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
