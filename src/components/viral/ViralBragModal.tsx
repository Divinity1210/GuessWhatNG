"use client";

import { useState } from "react";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
} from "@/lib/game/viral-engine";
import { TrophyIcon, ZapIcon, FlameIcon, CheckIcon } from "@/components/ui/Icons";

interface ViralBragCardProps {
  username: string;
  turf: string;
  sessionName: string;
  prizePool: number;
  timeSeconds: string;
  answeredCount: number;
  used2xLock: boolean;
  challengeQuestion: string;
  referralCode: string;
}

export function ViralBragCard({
  username,
  turf,
  sessionName,
  prizePool,
  timeSeconds,
  answeredCount,
  used2xLock,
  challengeQuestion,
  referralCode,
}: ViralBragCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const waUrl = buildWhatsAppShareUrl({
    username,
    referralCode,
    sessionName,
    prizePool,
    timeSeconds,
    challengeQuestion,
    turf,
  });

  const twitterUrl = buildTwitterShareUrl({
    referralCode,
    sessionName,
    timeSeconds,
    challengeQuestion,
    turf,
  });

  const handleCopyLink = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://guesswhat-tan.vercel.app";
    const link = `${origin}/sign-up${referralCode ? `?ref=${referralCode}` : ""}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadStatusCard = () => {
    setDownloading(true);
    try {
      const dataUrl = generateBragCardDataUrl({
        username,
        turf,
        sessionName,
        prizePool: `₦${prizePool.toLocaleString()}`,
        timeSeconds,
        answeredCount,
        used2xLock,
        challengeQuestion,
        referralCode,
      });
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `GuessWhat-${username}-PredictionCard.png`;
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#F7911B]/50 bg-gradient-to-b from-[#1a131c] via-[#121622] to-[#0d1018] p-6 shadow-2xl space-y-5 text-left">
      {/* Receipt Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF0400] to-[#F7911B] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
            <FlameIcon className="size-3.5" />
            <span>OFFICIAL LOCK-IN RECEIPT</span>
          </span>
        </div>
        <span className="text-xs font-bold text-[#F7911B]">
          Repping {turf}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Total Speed</p>
          <p className="mt-1 font-display text-xl sm:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
            <ZapIcon className="size-4" />
            <span>{timeSeconds}s</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Prize Pool</p>
          <p className="mt-1 font-display text-xl sm:text-2xl font-black text-[#F7911B]">
            ₦{prizePool.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">2x Sure Lock</p>
          <p className="mt-1 font-display text-xl sm:text-2xl font-black text-white">
            {used2xLock ? "ACTIVE 🔥" : `${answeredCount}/10`}
          </p>
        </div>
      </div>

      {/* Debate Prompt Box */}
      <div className="rounded-2xl border border-[#F7911B]/35 bg-[#F7911B]/10 p-4 space-y-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#F7911B]">
          🤔 Challenge Your Squad On This Question (Vote Counts Hidden!)
        </p>
        <p className="font-display text-base sm:text-lg font-bold text-white leading-snug">
          &ldquo;{challengeQuestion}&rdquo;
        </p>
        <p className="text-xs text-ink-2">
          Ask your WhatsApp group what they think the crowd picked — earn{" "}
          <strong className="text-[#F7911B]">+50 Bonus Coins</strong> for every friend who joins!
        </p>
      </div>

      {/* Viral Share Buttons */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <span>📲 Challenge Squad on WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleDownloadStatusCard}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] hover:brightness-110 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all"
        >
          <span>{downloading ? "Generating PNG..." : "📸 Download WhatsApp Status Card"}</span>
        </button>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-bold text-white transition-all"
        >
          <span>𝕏 Post Debate on X (Twitter)</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-bold text-white transition-all"
        >
          {copied ? (
            <>
              <CheckIcon className="size-4 text-emerald-400" />
              <span className="text-emerald-400">Invite Link Copied!</span>
            </>
          ) : (
            <span>🔗 Copy Invite Link ({referralCode || "BONUS"})</span>
          )}
        </button>
      </div>
    </div>
  );
}
