"use client";

import { useState } from "react";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
} from "@/lib/game/viral-engine";
import { CheckIcon } from "@/components/ui/Icons";

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
        a.download = `GuessWhat-${username}-Receipt.png`;
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6 space-y-5 text-left">
      {/* Receipt Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222631] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#10B981]" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F4F5F8]">
            VERIFIED ENTRY RECEIPT
          </span>
        </div>
        <span className="font-mono text-xs text-[#8A92A6]">
          DIVISION: <strong className="text-[#F7911B]">{turf}</strong>
        </span>
      </div>

      {/* 3-Column Telemetry Strip */}
      <div className="grid grid-cols-3 divide-x divide-[#222631] rounded-lg border border-[#222631] bg-[#090A0D] py-3 text-center">
        <div className="px-2">
          <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Lock Speed</p>
          <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-[#10B981] tabular-nums">
            {timeSeconds}s
          </p>
        </div>

        <div className="px-2">
          <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Session Pool</p>
          <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-[#F7911B] tabular-nums">
            ₦{prizePool.toLocaleString()}
          </p>
        </div>

        <div className="px-2">
          <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">2x Multiplier</p>
          <p className="mt-1 font-mono text-lg sm:text-xl font-semibold text-[#F4F5F8] tabular-nums">
            {used2xLock ? "LOCKED" : `${answeredCount}/10`}
          </p>
        </div>
      </div>

      {/* Debate Prompt Box */}
      <div className="rounded-lg border border-[#222631] bg-[#171A21] p-4 space-y-1.5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#F7911B]">
          CHALLENGE PROMPT · VOTE DISTRIBUTION HIDDEN UNTIL CLOSE
        </p>
        <p className="text-sm sm:text-base font-semibold text-[#F4F5F8] leading-snug">
          &ldquo;{challengeQuestion}&rdquo;
        </p>
        <p className="text-xs text-[#8A92A6]">
          Share your slip with your group — earn{" "}
          <strong className="text-[#F4F5F8]">+50 GW Coins</strong> per verified signup.
        </p>
      </div>

      {/* Share Actions */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7911B] hover:bg-[#FFA236] px-4 py-2.5 text-xs font-semibold text-[#090A0D] transition-colors"
        >
          <span>Share Challenge on WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleDownloadStatusCard}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2E3442] bg-[#171A21] hover:bg-[#1F242D] px-4 py-2.5 text-xs font-semibold text-[#F4F5F8] transition-colors"
        >
          <span>{downloading ? "Rendering PNG..." : "Download Receipt PNG (1080×1350)"}</span>
        </button>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#222631] bg-[#090A0D] hover:border-[#2E3442] px-4 py-2.5 text-xs font-medium text-[#C8CDD8] transition-colors"
        >
          <span>Post on X</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#222631] bg-[#090A0D] hover:border-[#2E3442] px-4 py-2.5 font-mono text-xs font-medium text-[#C8CDD8] transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon className="size-3.5 text-[#10B981]" />
              <span className="text-[#10B981]">LINK COPIED</span>
            </>
          ) : (
            <span>COPY REF LINK ({referralCode || "BONUS"})</span>
          )}
        </button>
      </div>
    </div>
  );
}
