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

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardRow[]>([]);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [previousWinners, setPreviousWinners] = useState<LeaderboardRow[]>([]);
  const [previousSessionName, setPreviousSessionName] = useState<string>("Previous Session");
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
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
          commitUpdate,
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
    [],
  );

  useEffect(() => {
    async function load() {
      try {
        const activeSessions = await getActiveSessions();
        const active = activeSessions[0] ?? null;
        setActiveSession(active);

        let completedSessionFromApi: SessionRow | null = null;

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

            if (Array.isArray(data.sessions)) {
              completedSessionFromApi =
                (data.sessions as SessionRow[]).find((s) => s.status === "completed") ?? null;
            }
          }
        }

        const latestCompletedId =
          completedSessionFromApi?.id ?? (await getLatestCompletedSessionId());
        if (completedSessionFromApi?.name) {
          setPreviousSessionName(completedSessionFromApi.name);
        }
        if (latestCompletedId) {
          const prevLb = await getSessionLeaderboard(latestCompletedId, 3);
          setPreviousWinners(prevLb.slice(0, 3));
        }

        if (user?.id) {
          const inboxRes = await fetch(
            `/api/inbox?userId=${encodeURIComponent(user.id)}`,
            { cache: "no-store" },
          ).catch(() => null);
          if (inboxRes && inboxRes.ok) {
            const inboxData = await inboxRes.json();
            if (typeof inboxData.unreadCount === "number") {
              setUnreadInboxCount(inboxData.unreadCount);
            }
          }
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // Real Live Leaderboard Polling on Dashboard (100% Real Server Updates, Zero Simulation)
  useEffect(() => {
    if (!activeSession || livePaused) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/game/session?sessionId=${encodeURIComponent(activeSession.id)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const serverRows = ((data.leaderboard ?? []) as LeaderboardRow[]).slice(0, 6);
        applyLeaderboardUpdate(serverRows, data.totalGuesses ?? 0);
      } catch {
        // Ignore transient network errors
      }
    }, 4500);

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
  const topLeader = liveLeaderboard[0] ?? null;
  const ringScore = myRow ? myRow.points : (topLeader?.points ?? 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Primary Play Card (Product Document Page 32 & 33) ── */}
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
              {unreadInboxCount > 0 && (
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/35 px-3 py-0.5 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
                >
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                  <span>{unreadInboxCount} Unread in Inbox</span>
                </Link>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {activeSession?.name ?? "Guess What Live Session"}
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Predict the option most players will select across 10 quick questions.
              Top 36 scorers share{" "}
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
                    Your Best Score
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

      {/* ── Personal Best & Session Analytics Bento Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Circular Best Score Ring */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex items-center gap-4">
          <div
            className="relative grid size-16 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#F7911B ${Math.min(100, ringScore) * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
            }}
          >
            <div className="grid size-12 place-items-center rounded-full bg-[#0d111c] text-center">
              <span className="font-display text-sm font-extrabold text-white tabular-nums">
                {ringScore}
              </span>
            </div>
            <progress className="sr-only" max={100} value={ringScore}>
              {ringScore}%
            </progress>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {myRow ? "Your Best Score" : "Leader Target Score"}
            </p>
            <p className="font-display text-base font-bold text-white truncate">
              {myRow
                ? `${formatOrdinal(myRow.rank)} Place · ${formatDuration(myRow.response_ms)}`
                : topLeader
                ? `@${topLeader.profiles?.username ?? "Leader"} · ${topLeader.points} pts`
                : "Play 10 questions to rank"}
            </p>
            <p className="text-xs text-slate-400">
              Replays never lower your best score
            </p>
          </div>
        </div>

        {/* Card 2: Top Contenders Mini Bar Chart */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Top Contenders (Points)
            </p>
            <span className="text-xs text-slate-400">Max 100</span>
          </div>
          <div className="space-y-1.5">
            {liveLeaderboard.slice(0, 3).map((r) => (
              <div key={r.user_id} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate text-slate-300 font-medium">
                  {r.profiles?.username ?? "Player"}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF0400] to-[#F7911B]"
                    style={{ width: `${Math.min(100, Math.max(8, r.points))}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-white w-8 text-right tabular-nums">
                  {r.points}
                </span>
              </div>
            ))}
            {liveLeaderboard.length === 0 && (
              <p className="text-xs text-slate-500 py-2">No scores recorded yet.</p>
            )}
          </div>
        </div>

        {/* Card 3: Prize Pool Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              36 Winners Payouts
            </p>
            <Link
              href="/leaderboard?tab=prizes"
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              Prize Table →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center">
              <p className="text-[10px] text-slate-400">1st</p>
              <p className="font-mono text-xs font-bold text-accent">₦100k</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center">
              <p className="text-[10px] text-slate-400">2nd</p>
              <p className="font-mono text-xs font-bold text-white">₦50k</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center">
              <p className="text-[10px] text-slate-400">4th–36th</p>
              <p className="font-mono text-xs font-bold text-emerald-400">₦10k</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Animated Leaderboard (Product Document Page 19 & 27) ── */}
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
              <span>{livePaused ? "Paused" : "Live Sync"}</span>
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
                <th className="py-3 pr-4">Best Points</th>
                <th className="py-3 text-right">Best Time</th>
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
                        {row.prize > 0 ? `₦${row.prize.toLocaleString()}` : "—"}
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

      {/* ── Previous Session Winners (Product Document Page 20, 32 & 33) ── */}
      {previousWinners.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <TrophyIcon className="size-4 text-amber-400" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Previous Session Winners
                </h2>
                <p className="text-xs text-slate-400">
                  Top 3 Winners · {previousSessionName}
                </p>
              </div>
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
            aria-label="Previous session top 3 winners"
            className="overflow-x-auto"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-medium text-slate-400">
                  <th className="py-2.5 pr-4">Position</th>
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Points</th>
                  <th className="py-2.5 pr-4">Time</th>
                  <th className="py-2.5 text-right">Prize Won</th>
                </tr>
              </thead>
              <tbody>
                {previousWinners.slice(0, 3).map((w) => (
                  <tr
                    key={w.user_id}
                    className="border-b border-white/5 last:border-0 text-slate-200"
                  >
                    <td className="py-3 pr-4 font-display font-bold">
                      {formatOrdinal(w.rank)}
                    </td>
                    <td className="py-3 pr-4">{w.profiles?.username ?? "Player"}</td>
                    <td className="py-3 pr-4 font-mono font-bold tabular-nums">{w.points}</td>
                    <td className="py-3 pr-4 font-mono text-slate-400 tabular-nums">
                      {formatDuration(w.response_ms)}
                    </td>
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
