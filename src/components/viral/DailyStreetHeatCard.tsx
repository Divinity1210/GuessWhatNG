"use client";

import { useEffect, useState } from "react";
import { getTodaysStreetPoll, buildWhatsAppShareUrl } from "@/lib/game/viral-engine";
import { claimDailyPollBonus } from "@/lib/supabase/queries";
import { CheckIcon } from "@/components/ui/Icons";

interface DailyStreetHeatCardProps {
  userId: string;
  username?: string;
  referralCode?: string;
  turf?: string;
  onCoinsAwarded?: (bonusCoins: number, newStreak: number) => void;
}

export function DailyStreetHeatCard({
  userId,
  username,
  referralCode,
  turf,
  onCoinsAwarded,
}: DailyStreetHeatCardProps) {
  const poll = getTodaysStreetPoll();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(1);
  const [bonusEarned, setBonusEarned] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const savedPick = localStorage.getItem(`gw_poll_pick_${userId}_${todayKey}`);
    const savedStreak = Number(localStorage.getItem(`gw_streak_${userId}`) ?? "1");
    setStreakDays(savedStreak);
    if (savedPick) {
      setSelectedOptionId(savedPick);
    }
  }, [userId]);

  const handleVote = async (optionId: string) => {
    if (selectedOptionId || claiming) return;
    setClaiming(true);
    setSelectedOptionId(optionId);

    const todayKey = new Date().toISOString().slice(0, 10);
    if (typeof window !== "undefined") {
      localStorage.setItem(`gw_poll_pick_${userId}_${todayKey}`, optionId);
    }

    try {
      const { bonusCoins, streakDays: newStreak } = await claimDailyPollBonus(userId);
      setStreakDays(newStreak);
      setBonusEarned(bonusCoins);
      if (bonusCoins > 0 && onCoinsAwarded) {
        onCoinsAwarded(bonusCoins, newStreak);
      }
    } catch (err) {
      console.error("Daily poll claim error:", err);
    } finally {
      setClaiming(false);
    }
  };

  const waShareUrl = buildWhatsAppShareUrl({
    username,
    referralCode,
    turf,
    challengeQuestion: poll.question,
  });

  return (
    <section className="rounded-xl border border-[#222631] bg-[#111318] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222631] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="rounded border border-[#F7911B]/30 bg-[#F7911B]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#F7911B]">
            {poll.tag}
          </span>
          <span className="text-xs text-[#8A92A6] hidden sm:inline">
            Daily Consensus Warm-Up
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
          <span className="rounded border border-[#222631] bg-[#171A21] px-2 py-0.5 text-[#C8CDD8]">
            STREAK: {streakDays}D
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-semibold ${
              selectedOptionId
                ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]"
                : "border-[#F7911B]/30 bg-[#F7911B]/10 text-[#F7911B]"
            }`}
          >
            {selectedOptionId ? "SETTLED" : "+25 GW"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-[#F4F5F8] leading-snug">
          {poll.question}
        </h3>
        <p className="mt-1 text-xs text-[#8A92A6]">
          Lock in today&apos;s majority outcome to maintain your daily streak multiplier.
        </p>

        <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
          {poll.options.map((opt, idx) => {
            const isChosen = selectedOptionId === opt.id;
            const isWinner = idx === 0;
            const letter = String.fromCharCode(65 + idx);

            return (
              <button
                key={opt.id}
                type="button"
                disabled={!!selectedOptionId}
                onClick={() => handleVote(opt.id)}
                className={`relative overflow-hidden rounded-lg border p-3 text-left transition-colors ${
                  selectedOptionId
                    ? isChosen
                      ? "border-[#F7911B] bg-[#171A21]"
                      : "border-[#222631] bg-[#090A0D]/60 opacity-80"
                    : "border-[#222631] bg-[#171A21]/70 hover:border-[#2E3442] hover:bg-[#171A21] cursor-pointer"
                }`}
              >
                {selectedOptionId && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      isWinner ? "bg-[#F7911B]/15" : "bg-white/[0.03]"
                    }`}
                    style={{ width: `${opt.pct}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded border font-mono text-[10px] font-semibold ${
                        isChosen
                          ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                          : "border-[#2E3442] bg-[#090A0D] text-[#8A92A6]"
                      }`}
                    >
                      {letter}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F4F5F8] truncate">
                        {opt.label}
                      </p>
                      {selectedOptionId && (
                        <p className="mt-0.5 font-mono text-[10px] text-[#8A92A6]">
                          {isWinner ? "RANK #1 CONSENSUS" : isChosen ? "YOUR PICK" : `RANK #${idx + 1}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedOptionId ? (
                    <span className="font-mono text-xs font-semibold text-[#F4F5F8] tabular-nums shrink-0">
                      {opt.pct}%
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-[#8A92A6] shrink-0">
                      Pick
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[#222631] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-[#8A92A6]">
            <span className="font-mono text-[#F4F5F8] font-medium tabular-nums">
              {(poll.totalVotes + (selectedOptionId ? 1 : 0)).toLocaleString()}
            </span>
            <span>entries recorded today</span>
            {bonusEarned && bonusEarned > 0 ? (
              <span className="ml-1 inline-flex items-center gap-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 font-mono text-[11px] text-[#10B981] font-medium">
                <CheckIcon className="size-3" /> +{bonusEarned} GW
              </span>
            ) : null}
          </div>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#F7911B] hover:underline"
          >
            Share poll on WhatsApp (+50 GW/invite) →
          </a>
        </div>
      </div>
    </section>
  );
}
