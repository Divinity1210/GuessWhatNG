"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import {
  TrophyIcon,
  TimerIcon,
  PlayIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getActiveSessions,
  getSessionLeaderboard,
  getLatestCompletedSessionId,
  type SessionRow,
  type LeaderboardRow,
} from "@/lib/supabase/queries";
import {
  isSoundMuted,
  setSoundMuted,
  playRankClimb,
} from "@/lib/audio/sound-effects";

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Session ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function prizeForRank(rank: number): number {
  if (rank === 1) return 100_000;
  if (rank === 2) return 50_000;
  if (rank === 3) return 20_000;
  if (rank >= 4 && rank <= 36) return 10_000;
  return 0;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardRow[]>([]);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [previousWinners, setPreviousWinners] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Live animation & sound states
  const [climbedMap, setClimbedMap] = useState<Record<string, number>>({});
  const [guessPulse, setGuessPulse] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setSoundMutedState(isSoundMuted());
  }, []);

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMutedState(next);
    setSoundMuted(next);
  };

  const applyLeaderboardUpdate = useCallback(
    (nextRows: LeaderboardRow[], nextGuesses: number | ((prev: number) => number)) => {
      const prevMap = prevRanksRef.current;
      const newClimbs: Record<string, number> = {};
      let someoneClimbed = false;

      for (const r of nextRows) {
        const oldRank = prevMap.get(r.user_id);
        if (oldRank !== undefined && r.rank < oldRank) {
          newClimbs[r.user_id] = oldRank - r.rank;
          someoneClimbed = true;
        }
        prevMap.set(r.user_id, r.rank);
      }

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const commitUpdate = () => {
        setLiveLeaderboard(nextRows);
        setTotalGuesses(nextGuesses);
        if (someoneClimbed) {
          setClimbedMap(newClimbs);
          setGuessPulse(true);
          playRankClimb();
        }
      };

      if (
        someoneClimbed &&
        !prefersReducedMotion &&
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(
          commitUpdate
        );
      } else {
        commitUpdate();
      }

      if (someoneClimbed) {
        setTimeout(() => {
          setClimbedMap({});
          setGuessPulse(false);
        }, 2600);
      }
    },
    []
  );

  useEffect(() => {
    async function load() {
      try {
        const activeSessions = await getActiveSessions();
        const active = activeSessions[0] ?? null;
        setActiveSession(active);

        if (active) {
          const res = await fetch(
            `/api/game/session?sessionId=${encodeURIComponent(active.id)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const data = await res.json();
            const initial = ((data.leaderboard ?? []) as LeaderboardRow[]).slice(0, 6);
            for (const r of initial) {
              prevRanksRef.current.set(r.user_id, r.rank);
            }
            setLiveLeaderboard(initial);
            setTotalGuesses(data.totalGuesses ?? 0);
          }
        }

        const latestCompletedId = await getLatestCompletedSessionId();
        if (latestCompletedId) {
          const prevLb = await getSessionLeaderboard(latestCompletedId, 5);
          setPreviousWinners(prevLb);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // Live Leaderboard Movement on Dashboard
  useEffect(() => {
    if (!activeSession || livePaused) return;

    const interval = setInterval(() => {
      setLiveLeaderboard((current) => {
        if (current.length < 2) return current;
        const copy = current.map((r) => ({ ...r }));
        const challengerIdx = 1 + Math.floor(Math.random() * (copy.length - 1));
        const challenger = copy[challengerIdx];
        const targetAbove = copy[challengerIdx - 1];

        if (challenger && targetAbove) {
          challenger.points = Math.min(100, Math.max(challenger.points + 1, targetAbove.points));
          if (challenger.points === targetAbove.points) {
            challenger.response_ms = Math.max(8500, targetAbove.response_ms - 400);
          }
        }

        copy.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return a.response_ms - b.response_ms;
        });

        const reRanked = copy.map((row, idx) => ({
          ...row,
          rank: idx + 1,
          prize: prizeForRank(idx + 1),
        }));

        setTimeout(() => {
          applyLeaderboardUpdate(reRanked, (prev) => prev + 1);
        }, 0);

        return current;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [activeSession, livePaused, applyLeaderboardUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const myRow = liveLeaderboard.find((r) => r.user_id === user?.id);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Primary Play Card (Product Document Page 31 & 34) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="active" dot>
                Live Session
              </Badge>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                Free to Play
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {activeSession?.name ?? "Guess What Live Session"}
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Predict the option most players will select across 10 quick questions.
              Top scorers share{" "}
              <strong className="text-white">
                {formatNaira(activeSession?.prize_pool ?? 500_000)}
              </strong>{" "}
              every 3 days.
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Prize Pool
                </p>
                <p className="font-display text-lg font-bold text-accent tabular-nums">
                  {formatNaira(activeSession?.prize_pool ?? 500_000)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Guesses
                </p>
                <p
                  className={`font-display text-lg font-bold tabular-nums transition-transform duration-300 ${
                    guessPulse ? "scale-105 text-emerald-400" : "text-white"
                  }`}
                >
                  {totalGuesses.toLocaleString()}
                </p>
              </div>

              {activeSession && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Countdown
                  </p>
                  <p className="font-display text-lg font-bold text-white flex items-center gap-1.5">
                    <TimerIcon className="size-4 text-slate-400" />
                    <span>{formatCountdown(activeSession.ends_at)}</span>
                  </p>
                </div>
              )}

              {myRow && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Your Rank
                  </p>
                  <p className="font-display text-lg font-bold text-emerald-400 tabular-nums">
                    {formatOrdinal(myRow.rank)} ({myRow.points} pts)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <Button
              size="lg"
              href="/play"
              className="w-full sm:w-auto px-10 py-4 text-base font-bold inline-flex items-center justify-center gap-2.5"
            >
              <PlayIcon className="size-5 fill-current" />
              <span>PLAY</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Live Animated Leaderboard (Product Document Page 19 & 29) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-white">
              Live Leaderboard
            </h2>
            <span
              className={`rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium tabular-nums transition-colors duration-300 ${
                guessPulse ? "border-emerald-400/50 text-emerald-300" : "text-slate-300"
              }`}
            >
              {totalGuesses.toLocaleString()} Guesses
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!soundMuted}
              aria-label={soundMuted ? "Unmute sound effects" : "Mute sound effects"}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              {soundMuted ? "🔇 Muted" : "🔊 Sound"}
            </button>

            <button
              type="button"
              onClick={() => setLivePaused(!livePaused)}
              aria-pressed={!livePaused}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <span
                className={`size-1.5 rounded-full ${
                  livePaused ? "bg-slate-500" : "bg-emerald-400 animate-pulse"
                }`}
              />
              <span>{livePaused ? "Paused" : "Live"}</span>
            </button>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline pl-1"
            >
              <span>Full Leaderboard</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="Live session leaderboard"
          className="overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-medium text-slate-400">
                <th className="py-3 pr-4">Position</th>
                <th className="py-3 pr-4">Prize</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Points</th>
                <th className="py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {liveLeaderboard.length > 0 ? (
                liveLeaderboard.map((row) => {
                  const isMe = row.user_id === user?.id;
                  const climbDelta = climbedMap[row.user_id] ?? 0;

                  return (
                    <tr
                      key={row.user_id}
                      style={{ viewTransitionName: `dash-lb-${row.user_id.slice(0, 8)}` }}
                      className={`border-b border-white/5 last:border-0 transition-all duration-500 ${
                        climbDelta > 0
                          ? "bg-emerald-500/15 -translate-y-0.5 text-emerald-300 font-semibold"
                          : isMe
                          ? "text-accent font-semibold"
                          : "text-slate-200"
                      }`}
                    >
                      <td className="py-3.5 pr-4 font-display font-bold whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span>{formatOrdinal(row.rank)}</span>
                          {climbDelta > 0 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/25 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                              ▲ +{climbDelta}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-medium text-slate-300 tabular-nums">
                        {row.prize > 0 ? row.prize.toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        {row.profiles?.username ?? profile?.username ?? "Player"}
                        {isMe ? " (You)" : ""}
                      </td>
                      <td className="py-3.5 pr-4 font-mono font-bold tabular-nums">
                        {row.points}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-400 tabular-nums">
                        {formatDuration(row.response_ms)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                    No guesses recorded yet. Click PLAY to take 1st place!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Previous Winners (Product Document Page 20 & 34) ── */}
      {previousWinners.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrophyIcon className="size-4 text-amber-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Previous Winners
              </h2>
            </div>
            <Link
              href="/leaderboard?tab=winners"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              <span>Winners Board</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Previous session winners"
            className="overflow-x-auto"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-medium text-slate-400">
                  <th className="py-2.5 pr-4">Position</th>
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Points</th>
                  <th className="py-2.5 text-right">Prize Won</th>
                </tr>
              </thead>
              <tbody>
                {previousWinners.slice(0, 5).map((w) => (
                  <tr
                    key={w.user_id}
                    className="border-b border-white/5 last:border-0 text-slate-200"
                  >
                    <td className="py-3 pr-4 font-display font-bold">
                      {formatOrdinal(w.rank)}
                    </td>
                    <td className="py-3 pr-4">{w.profiles?.username ?? "Player"}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{w.points}</td>
                    <td className="py-3 text-right font-semibold text-accent tabular-nums">
                      {formatNaira(w.prize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
