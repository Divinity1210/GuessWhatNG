"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VIRAL_DEMO_QUESTIONS, buildWhatsAppShareUrl } from "@/lib/game/viral-engine";
import { FlameIcon, TimerIcon, TrophyIcon, ZapIcon, ArrowRightIcon, CheckIcon } from "@/components/ui/Icons";

export function LandingMiniGame() {
  const demoQuestions = VIRAL_DEMO_QUESTIONS.slice(0, 3);
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [use2xLock, setUse2xLock] = useState(false);
  const [lockUsedOnStep, setLockUsedOnStep] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [questionStart, setQuestionStart] = useState<number>(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished || selectedId) return;
    setQuestionStart(Date.now());
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - questionStart);
    }, 100);
    return () => clearInterval(interval);
  }, [step, finished, selectedId, questionStart]);

  const currentQ = demoQuestions[step];

  const handlePick = (optId: string) => {
    if (selectedId) return;
    const tookMs = Math.max(400, Date.now() - questionStart);
    setSelectedId(optId);
    const chosen = currentQ.options.find((o) => o.id === optId);
    const basePts = chosen?.points ?? 7;
    const isLocked = use2xLock && lockUsedOnStep === null;
    if (isLocked) {
      setLockUsedOnStep(step);
    }
    const earned = isLocked ? basePts * 2 : basePts;
    setTotalPoints((p) => p + earned);
    setTotalMs((t) => t + tookMs);
  };

  const handleNext = () => {
    if (step < demoQuestions.length - 1) {
      setStep((s) => s + 1);
      setSelectedId(null);
      setUse2xLock(false);
      setElapsedMs(0);
    } else {
      setFinished(true);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedId(null);
    setUse2xLock(false);
    setLockUsedOnStep(null);
    setTotalPoints(0);
    setTotalMs(0);
    setElapsedMs(0);
    setFinished(false);
  };

  if (finished) {
    const timeSec = (totalMs / 1000).toFixed(1);
    const waUrl = buildWhatsAppShareUrl({
      sessionName: "GuessWhat 3-Question Street Challenge",
      timeSeconds: timeSec,
      challengeQuestion: demoQuestions[0].title,
      prizePool: 250_000,
    });

    return (
      <div className="rounded-3xl border border-[#F7911B]/50 bg-gradient-to-b from-[oklch(22%_0.03_60)] to-[oklch(12%_0.01_60)] p-6 shadow-2xl backdrop-blur-xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black text-emerald-300">
            <TrophyIcon className="size-3.5" />
            <span>CROWD IQ RESULT</span>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-gray-400 hover:text-white underline"
          >
            Replay Demo
          </button>
        </div>

        <div className="mt-5 text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
            Your Crowd Prediction Score
          </p>
          <p className="font-display text-5xl font-black text-white">
            {totalPoints} <span className="text-2xl text-[#F7911B]">/ 40 pts</span>
          </p>
          <p className="text-xs text-gray-300">
            Total Speed: <strong className="text-emerald-400">{timeSec}s</strong> ·{" "}
            {totalPoints >= 35
              ? "🔥 Pure Odogwu! You read Nigerians like a book!"
              : "⚡ Sharp intuition! You're ready for the ₦250k pot."}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[#F7911B]/30 bg-[#F7911B]/10 p-3.5 text-center">
          <p className="text-xs font-bold text-white">
            🎁 Sign up now to lock in <span className="text-[#F7911B]">100 FREE COINS</span> + enter Weekend Showdown
          </p>
        </div>

        <div className="mt-5 space-y-2.5">
          <Link
            href="/sign-up"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all"
          >
            <span>Claim 100 Free Coins & Play For Cash</span>
            <ArrowRightIcon className="size-4" />
          </Link>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-all"
          >
            <span>📲 Challenge Your WhatsApp Squad to Beat {totalPoints} pts</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#F7911B]/40 bg-gradient-to-b from-[oklch(20%_0.02_60)] to-[oklch(12%_0.01_60)] p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-[#F7911B] uppercase tracking-wider">
            TRY LIVE DEMO · Q{step + 1}/3
          </span>
        </div>
        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
          <TimerIcon className="size-3.5" />
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        </span>
      </div>

      {/* Category & 2x Lock toggle */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-gray-200">
          {currentQ.category}
        </span>

        {lockUsedOnStep === null ? (
          <button
            type="button"
            disabled={!!selectedId}
            onClick={() => setUse2xLock((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black transition-all ${
              use2xLock
                ? "bg-gradient-to-r from-[#FF0400] to-[#F7911B] text-white shadow-md shadow-orange-500/30 scale-105"
                : "border border-[#F7911B]/40 bg-[#F7911B]/10 text-[#F7911B] hover:bg-[#F7911B]/20"
            }`}
          >
            <FlameIcon className="size-3.5" />
            <span>{use2xLock ? "2x SURE LOCK ARMED!" : "Use 2x Sure Lock (1 left)"}</span>
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-gray-400">
            {lockUsedOnStep === step ? "🔥 2x Lock Applied!" : "2x Lock Used"}
          </span>
        )}
      </div>

      {/* Question Title */}
      <h3 className="mt-3 font-display text-lg sm:text-xl font-bold text-white leading-snug">
        {currentQ.title}
      </h3>
      <p className="mt-1 text-xs text-gray-400">
        Tap the option you think <strong className="text-white">most Nigerians</strong> will choose:
      </p>

      {/* Options */}
      <div className="mt-4 space-y-2.5">
        {currentQ.options.map((item) => {
          const isPicked = selectedId === item.id;
          const isTop = item.rank === 1;
          const multiplier = lockUsedOnStep === step ? 2 : 1;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!!selectedId}
              onClick={() => handlePick(item.id)}
              className={`w-full text-left relative overflow-hidden rounded-xl border p-3 transition-all ${
                selectedId
                  ? isPicked
                    ? "border-[#F7911B] bg-[#F7911B]/20"
                    : "border-white/10 bg-white/5 opacity-85"
                  : "border-white/15 bg-white/5 hover:border-[#F7911B]/60 hover:bg-white/10 cursor-pointer"
              }`}
            >
              {selectedId && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                    isTop
                      ? "bg-gradient-to-r from-[#F7911B]/35 to-[#FF0400]/35"
                      : "bg-white/10"
                  }`}
                  style={{ width: `${item.crowdPct}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white text-xs sm:text-sm truncate">{item.label}</p>
                  {selectedId && (
                    <p className="text-[11px] text-[#F7911B] font-semibold mt-0.5">
                      {isTop ? "👑 #1 Crowd Favorite" : `#${item.rank} Most Picked`} · +{item.points * (isPicked ? multiplier : 1)} pts
                    </p>
                  )}
                </div>

                {selectedId ? (
                  <span className="font-display font-black text-base text-white shrink-0">
                    {item.crowdPct}%
                  </span>
                ) : (
                  <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-gray-300 shrink-0">
                    Pick
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer / Next button */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
        <div className="text-xs text-gray-300">
          Score: <strong className="text-[#F7911B] font-bold">{totalPoints} pts</strong>
        </div>

        {selectedId ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-4 py-2 text-xs font-black text-white shadow-md hover:brightness-110 transition-all"
          >
            <span>{step < demoQuestions.length - 1 ? "Next Question" : "See My Score"}</span>
            <ArrowRightIcon className="size-3.5" />
          </button>
        ) : (
          <span className="text-[11px] text-[#F7911B] font-semibold flex items-center gap-1">
            <ZapIcon className="size-3.5" />
            <span>Tap an option to test your intuition</span>
          </span>
        )}
      </div>
    </div>
  );
}
