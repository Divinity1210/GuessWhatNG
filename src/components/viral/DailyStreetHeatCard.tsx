"use client";

import { useEffect, useState } from "react";
import { getTodaysStreetPoll, buildWhatsAppShareUrl } from "@/lib/game/viral-engine";
import { claimDailyPollBonus } from "@/lib/supabase/queries";
import { FlameIcon, CoinsIcon, UsersIcon, CheckIcon } from "@/components/ui/Icons";

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
    <section className="relative overflow-hidden rounded-card border border-[#F7911B]/35 bg-gradient-to-br from-[#19141d] via-paper-2 to-[#131824] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7911B]/15 border border-[#F7911B]/35 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#F7911B]">
            <FlameIcon className="size-3.5" />
            <span>DAILY STREET HEAT · {poll.tag}</span>
          </span>
          <span className="text-xs text-ink-muted hidden sm:inline">
            Free Daily Warm-Up
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
            <FlameIcon className="size-3.5 text-orange-400" />
            <span>{streakDays}-Day Flame Streak</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300">
            <CoinsIcon className="size-3.5" />
            <span>{selectedOptionId ? "Claimed" : "+25 Free Coins"}</span>
          </span>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="font-display text-lg md:text-xl font-bold text-white leading-snug">
          {poll.question}
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          Predict what the majority of Nigerians are picking today to keep your Flame Streak alive!
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {poll.options.map((opt, idx) => {
            const isChosen = selectedOptionId === opt.id;
            const isWinner = idx === 0;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={!!selectedOptionId}
                onClick={() => handleVote(opt.id)}
                className={`relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
                  selectedOptionId
                    ? isChosen
                      ? "border-[#F7911B] bg-[#F7911B]/15 shadow-md"
                      : "border-white/10 bg-paper-3/70"
                    : "border-rule bg-paper-3 hover:border-[#F7911B]/50 hover:bg-paper-4 cursor-pointer"
                }`}
              >
                {selectedOptionId && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                      isWinner
                        ? "bg-gradient-to-r from-[#F7911B]/30 to-[#FF0400]/30"
                        : "bg-white/10"
                    }`}
                    style={{ width: `${opt.pct}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {opt.label}
                    </p>
                    {selectedOptionId && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#F7911B]">
                        {isWinner ? "👑 Crowd #1 Pick" : isChosen ? "Your Pick" : `Rank #${idx + 1}`}
                      </p>
                    )}
                  </div>

                  {selectedOptionId ? (
                    <span className="font-display text-base font-black text-white shrink-0">
                      {opt.pct}%
                    </span>
                  ) : (
                    <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-ink-2 shrink-0">
                      Vote
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <UsersIcon className="size-4 text-[#F7911B]" />
            <span>
              <strong className="text-white">
                {(poll.totalVotes + (selectedOptionId ? 1 : 0)).toLocaleString()}
              </strong>{" "}
              players voted today
            </span>
            {bonusEarned && bonusEarned > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300 font-bold animate-fade-in">
                <CheckIcon className="size-3" /> +{bonusEarned} Coins Added!
              </span>
            ) : null}
          </div>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
          >
            <span>📲 Spark Debate on WhatsApp (+50 Coins/Invite)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
