"use client";

import { useState } from "react";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  rank?: number;
  showRankBadge?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-2xl",
};

const colors = [
  "from-[#f7911b] to-[#d9480f]",
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-blue-700",
  "from-amber-500 to-orange-700",
  "from-rose-500 to-red-700",
  "from-cyan-500 to-teal-800",
  "from-lime-600 to-emerald-800",
  "from-slate-500 to-slate-700",
];

function getInitials(name: string): string {
  const cleaned = (name || "Player").replace(/^@+/, "").trim();
  if (!cleaned) return "PL";
  const parts = cleaned.split(/[\s_\-.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function getRankRingClass(rank?: number): string {
  if (rank === 1) {
    return "ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.2)]";
  }
  if (rank === 2) {
    return "ring-2 ring-slate-300/70";
  }
  if (rank === 3) {
    return "ring-2 ring-amber-600/75";
  }
  return "ring-1 ring-white/15";
}

export function Avatar({
  name,
  src,
  size = "md",
  rank,
  showRankBadge = true,
  className = "",
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const safeName = (name || "Player").trim() || "Player";
  const hash = safeName
    .split("")
    .reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 1), 0);
  const colorIndex = hash % colors.length;
  const ringClass = getRankRingClass(rank);
  const showImg = Boolean(src && failedSrc !== src);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {showImg && src ? (
        <img
          src={src}
          alt={safeName}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className={`${sizeMap[size]} rounded-full object-cover bg-[#131826] ${ringClass}`}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`${sizeMap[size]} grid place-items-center rounded-full bg-gradient-to-br ${colors[colorIndex]} font-display font-bold tracking-tight text-white select-none ${ringClass}`}
        >
          {getInitials(safeName)}
        </div>
      )}

      {showRankBadge && rank !== undefined && rank >= 1 && rank <= 3 && (
        <span
          className={`absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-[10px] font-black font-display text-white border border-[#090d16] shadow-sm ${
            rank === 1
              ? "bg-amber-500 text-slate-950"
              : rank === 2
              ? "bg-slate-300 text-slate-950"
              : "bg-amber-700 text-white"
          }`}
        >
          #{rank}
        </span>
      )}
    </div>
  );
}
