"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VIRAL_DEMO_QUESTIONS, buildWhatsAppShareUrl } from "@/lib/game/viral-engine";
import { TimerIcon, ArrowRightIcon } from "@/components/ui/Icons";

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
      sessionName: "GuessWhat 3-Question Trial",
      timeSeconds: timeSec,
      challengeQuestion: demoQuestions[0].title,
      prizePool: 250_000,
    });

    return (
      <div className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between border-b border-[#222631] pb-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#10B981]">
            SLIP SETTLED · 3/3 QUESTIONS
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-[#8A92A6] hover:text-[#F4F5F8]"
          >
            Reset slip
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-[#222631] bg-[#090A0D] p-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A92A6]">Crowd Yield</p>
            <p className="mt-1 font-mono text-2xl sm:text-3xl font-semibold text-[#F4F5F8] tabular-nums">
              {totalPoints} <span className="text-sm text-[#8A92A6]">/ 40 pts</span>
            </p>
          </div>
          <div className="border-l border-[#222631] pl-4">
            <p className="text-[11px] uppercase tracking-wider text-[#8A92A6]">Cumulative Time</p>
            <p className="mt-1 font-mono text-2xl sm:text-3xl font-semibold text-[#10B981] tabular-nums">
              {timeSec}s
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#C8CDD8] leading-relaxed">
          {totalPoints >= 34
            ? "Strong consensus read. Your picks matched the #1 crowd choice across the board."
            : "Solid baseline speed. In live pools, matching the #1 crowd option yields 10 points per round."}
        </p>

        <div className="mt-5 space-y-2.5">
          <Link
            href="/sign-up"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7911B] px-4 py-3 text-xs sm:text-sm font-semibold text-[#090A0D] hover:bg-[#FFA236] transition-colors"
          >
            <span>Open Player Account (100 GW Coins Included)</span>
            <ArrowRightIcon className="size-4" />
          </Link>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#222631] bg-[#171A21] px-4 py-2.5 text-xs font-medium text-[#C8CDD8] hover:border-[#2E3442] hover:text-[#F4F5F8] transition-colors"
          >
            <span>Send Challenge Slip via WhatsApp ({totalPoints} pts)</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
      {/* Slip Header */}
      <div className="flex items-center justify-between border-b border-[#222631] pb-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#F7911B]" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#C8CDD8]">
            INTERACTIVE SLIP · 0{step + 1} / 03
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded border border-[#222631] bg-[#090A0D] px-2 py-0.5 font-mono text-xs font-medium text-[#10B981] tabular-nums">
          <TimerIcon className="size-3" />
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        </span>
      </div>

      {/* Category & 2x Multiplier Control */}
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <span className="rounded border border-[#222631] bg-[#171A21] px-2 py-0.5 text-[11px] font-medium text-[#8A92A6]">
          {currentQ.category}
        </span>

        {lockUsedOnStep === null ? (
          <button
            type="button"
            disabled={!!selectedId}
            onClick={() => setUse2xLock((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
              use2xLock
                ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                : "border-[#2E3442] bg-[#171A21] text-[#C8CDD8] hover:border-[#F7911B]"
            }`}
          >
            <span>{use2xLock ? "2X MULTIPLIER ARMED" : "ARM 2X MULTIPLIER (1)"}</span>
          </button>
        ) : (
          <span className="font-mono text-[11px] font-medium text-[#8A92A6]">
            {lockUsedOnStep === step ? "2X ACTIVE" : "2X USED"}
          </span>
        )}
      </div>

      {/* Question Prompt */}
      <h3 className="mt-3.5 text-base sm:text-lg font-semibold text-[#F4F5F8] leading-snug">
        {currentQ.title}
      </h3>
      <p className="mt-1 text-xs text-[#8A92A6]">
        Select the option you expect the majority of players to lock in:
      </p>

      {/* Options List */}
      <div className="mt-4 space-y-2">
        {currentQ.options.map((item, idx) => {
          const isPicked = selectedId === item.id;
          const isTop = item.rank === 1;
          const multiplier = lockUsedOnStep === step ? 2 : 1;
          const letter = String.fromCharCode(65 + idx);

          return (
            <button
              key={item.id}
              type="button"
              disabled={!!selectedId}
              onClick={() => handlePick(item.id)}
              className={`w-full text-left relative overflow-hidden rounded-lg border p-3 transition-colors ${
                selectedId
                  ? isPicked
                    ? "border-[#F7911B] bg-[#171A21]"
                    : "border-[#222631] bg-[#090A0D]/70 opacity-80"
                  : "border-[#222631] bg-[#171A21]/70 hover:border-[#2E3442] hover:bg-[#171A21] cursor-pointer"
              }`}
            >
              {selectedId && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isTop ? "bg-[#F7911B]/15" : "bg-white/[0.03]"
                  }`}
                  style={{ width: `${item.crowdPct}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded border font-mono text-[11px] font-semibold ${
                      isPicked
                        ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                        : "border-[#2E3442] bg-[#090A0D] text-[#8A92A6]"
                    }`}
                  >
                    {letter}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[#F4F5F8] truncate">
                      {item.label}
                    </p>
                    {selectedId && (
                      <p className="mt-0.5 font-mono text-[11px] text-[#8A92A6]">
                        {isTop ? "RANK #1 CONSENSUS" : `RANK #${item.rank}`} · +
                        {item.points * (isPicked ? multiplier : 1)} PTS
                      </p>
                    )}
                  </div>
                </div>

                {selectedId ? (
                  <span className="font-mono text-sm font-semibold text-[#F4F5F8] tabular-nums shrink-0">
                    {item.crowdPct}%
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-[#8A92A6] shrink-0">
                    Select
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Slip Footer */}
      <div className="mt-4 pt-3 border-t border-[#222631] flex items-center justify-between">
        <div className="font-mono text-xs text-[#8A92A6] tabular-nums">
          YIELD: <strong className="text-[#F4F5F8]">{totalPoints} PTS</strong>
        </div>

        {selectedId ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7911B] px-3.5 py-1.5 text-xs font-semibold text-[#090A0D] hover:bg-[#FFA236] transition-colors"
          >
            <span>{step < demoQuestions.length - 1 ? "Next Market" : "Settle Slip"}</span>
            <ArrowRightIcon className="size-3.5" />
          </button>
        ) : (
          <span className="text-[11px] text-[#8A92A6]">
            Instant crowd distribution reveal
          </span>
        )}
      </div>
    </div>
  );
}
