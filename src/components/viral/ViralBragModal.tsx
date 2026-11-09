"use client";

import { useState } from "react";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
} from "@/lib/game/viral-engine";
import {
  ZapIcon,
  FlameIcon,
  CheckIcon,
  ShareIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "@/components/ui/Icons";

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
        a.download = `GuessWhat-${username}-ScoreCard.png`;
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#F7911B]/50 bg-gradient-to-b from-[#1a131c] via-[#121622] to-[#0d1018] p-4 sm:p-6 shadow-2xl space-y-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF0400] to-[#F7911B] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
            <FlameIcon className="size-3.5" />
            <span>SESSION ENTRY LOCKED</span>
          </span>
        </div>
        <span className="text-xs font-bold text-[#F7911B]">
          {turf}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-ink-muted">Speed</p>
          <p className="mt-1 font-display text-lg sm:text-2xl font-black tabular-nums text-emerald-400 flex items-center justify-center gap-1">
            <ZapIcon className="size-4 shrink-0" />
            <span>{timeSeconds}s</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-ink-muted">Prize Pool</p>
          <p className="mt-1 font-display text-lg sm:text-2xl font-black tabular-nums text-[#F7911B]">
            ₦{prizePool.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-ink-muted">Answers</p>
          <p className="mt-1 font-display text-lg sm:text-2xl font-black tabular-nums text-white">
            {used2xLock ? "2X ACTIVE" : `${answeredCount}/10`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#F7911B]/35 bg-[#F7911B]/10 p-4 space-y-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#F7911B]">
          Challenge Your Friends On This Question
        </p>
        <p className="font-display text-base sm:text-lg font-bold text-white leading-snug">
          &ldquo;{challengeQuestion}&rdquo;
        </p>
        <p className="text-xs text-ink-2">
          Ask your group what they think the crowd picked and climb the Monthly Referral Leaderboard when friends join.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <ShareIcon className="size-4 shrink-0" />
          <span>Share on WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleDownloadStatusCard}
          disabled={downloading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] hover:brightness-110 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all"
        >
          <ZapIcon className="size-4 shrink-0" />
          <span>{downloading ? "Generating PNG..." : "Download Status Card"}</span>
        </button>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-bold text-white transition-all"
        >
          <ExternalLinkIcon className="size-3.5 shrink-0" />
          <span>Post on X</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-bold text-white transition-all"
        >
          {copied ? (
            <>
              <CheckIcon className="size-4 text-emerald-400" />
              <span className="text-emerald-400">Invite Link Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="size-3.5 shrink-0" />
              <span>Copy Invite Link ({referralCode || "BONUS"})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
