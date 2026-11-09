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
import { openSessionResultsPopup } from "@/components/game/SessionResultsPopup";

function formatCountdown(endsAt: string, nowMs: number = Date.now()): string {
  const diff = new Date(endsAt).getTime() - nowMs;
  if (diff <= 0) return "Session ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  }
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
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
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);
  const [previousSessionName, setPreviousSessionName] = useState<string>("Lagos vs Abuja Street Derby");
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [arenaPreview, setArenaPreview] = useState<{
    recentChat: { id: number; username: string; state: string; rank: number | null; body: string }[];
    topPoll: { id: string; category: string; title: string; totalVotes: number } | null;
  }>({ recentChat: [], topPoll: null });
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Live animation & sound states
  const [climbedMap, setClimbedMap] = useState<Record<string, number>>({});
  const [guessPulse, setGuessPulse] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setSoundMutedState(isSoundMuted());
    const tick = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(tick);
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
        const res = await fetch("/api/game/session", { cache: "no-store" });
        let completedSessionFromApi: SessionRow | null = null;
        let primarySession: SessionRow | null = null;

        if (res.ok) {
          const data = await res.json();
          primarySession = (data.session as SessionRow) ?? null;
          setActiveSession(primarySession);

          const initial = ((data.leaderboard ?? []) as LeaderboardRow[]).slice(0, 6);
          for (const r of initial) {
            prevRanksRef.current.set(r.user_id, r.rank);
          }
          setLiveLeaderboard(initial);
          setTotalGuesses(data.totalGuesses ?? 0);

          if (Array.isArray(data.sessions)) {
            const completedList = (data.sessions as SessionRow[]).filter(
              (s) => s.status === "completed",
            );
            completedSessionFromApi =
              completedList.find((s) => s.id !== primarySession?.id) ??
              completedList[0] ??
              null;
          }
        } else {
          const activeSessions = await getActiveSessions();
          primarySession = activeSessions[0] ?? null;
          setActiveSession(primarySession);
        }

        const latestCompletedId =
          completedSessionFromApi?.id ?? (await getLatestCompletedSessionId());
        if (completedSessionFromApi?.name) {
          setPreviousSessionName(completedSessionFromApi.name);
        }
        if (latestCompletedId) {
          setPreviousSessionId(latestCompletedId);
          const prevLb = await getSessionLeaderboard(latestCompletedId, 3);
          setPreviousWinners(prevLb.slice(0, 3));
        }

        const [inboxRes, commRes] = await Promise.all([
          fetch(`/api/inbox?userId=${encodeURIComponent(user?.id ?? "")}`, {
            cache: "no-store",
          }).catch(() => null),
          fetch(`/api/community?userId=${encodeURIComponent(user?.id ?? "")}`, {
            cache: "no-store",
          }).catch(() => null),
        ]);
        if (inboxRes && inboxRes.ok) {
          const inboxData = await inboxRes.json();
          if (typeof inboxData.unreadCount === "number") {
            setUnreadInboxCount(inboxData.unreadCount);
          }
        }
        if (commRes && commRes.ok) {
          const commData = await commRes.json();
          const recentChat = ((commData.liveChat ?? []) as {
            id: number;
            username: string;
            state: string;
            rank: number | null;
            body: string;
            isSystem?: boolean;
          }[])
            .slice(-3)
            .reverse();
          const topPoll =
            ((commData.posts ?? []) as {
              id: string;
              kind: string;
              category: string;
              title: string;
              totalVotes: number;
            }[]).find((p) => p.kind === "poll" || p.kind === "sponsored_poll") ?? null;
          setArenaPreview({ recentChat, topPoll });
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // Live Leaderboard Movement on Dashboard (polls real server data only — no simulated movements)
  useEffect(() => {
    if (!activeSession || livePaused) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/game/session?sessionId=${encodeURIComponent(activeSession.id)}`,
          { cache: "no-store", priority: "low" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.session) {
          setActiveSession(data.session as SessionRow);
        }
        const serverRows = ((data.leaderboard ?? []) as LeaderboardRow[]).slice(0, 6);
        applyLeaderboardUpdate(serverRows, data.totalGuesses ?? 0);
      } catch {
        // Ignore transient network errors
      }
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
  const isSessionEnded =
    !activeSession ||
    activeSession.status !== "active" ||
    new Date(activeSession.ends_at).getTime() <= nowMs;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Primary Play Card (Product Document Page 32 & 33) ── */}
      <section
        className={`rounded-2xl border bg-gradient-to-br from-[#0d141c] via-[#0d111c] to-[#111524] p-6 sm:p-10 space-y-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${
          isSessionEnded ? "border-amber-500/25" : "border-emerald-500/20"
        }`}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              {!isSessionEnded ? (
                <>
                  <Badge variant="active" dot>
                    LIVE · ONGOING SESSION
                  </Badge>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                    Free to Play · Open for Entries
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span>🏁 SESSION ENDED · CLOSED FOR PLAY</span>
                  </span>
                  <span className="rounded-full bg-white/[0.05] border border-white/15 px-3 py-0.5 text-xs font-semibold text-slate-300">
                    Official Results &amp; Winners Unlocked
                  </span>
                </>
              )}
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

            <p className="text-sm text-slate-300 leading-relaxed">
              {isSessionEnded ? (
                <>
                  This session has officially ended! Top 36 scorers share{" "}
                  <strong className="text-white">
                    {formatNaira(activeSession?.prize_pool ?? 500_000)}
                  </strong>
                  . View the full 10–1 crowd vote percentages and official winners.
                </>
              ) : (
                <>
                  Predict the option most players will select across 10 quick questions.
                  Top 36 scorers share{" "}
                  <strong className="text-white">
                    {formatNaira(activeSession?.prize_pool ?? 500_000)}
                  </strong>{" "}
                  when the countdown timer reaches zero.
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Prize Pool
                </p>
                <p className="font-display text-lg font-bold text-accent tabular-nums">
                  {formatNaira(activeSession?.prize_pool ?? 500_000)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  {isSessionEnded ? "Total Guesses" : "Live Guesses"}
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
                  <p
                    className={`text-[11px] uppercase tracking-wider font-semibold ${
                      isSessionEnded ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {isSessionEnded ? "Session Status" : "Closes In (Live)"}
                  </p>
                  <p className="font-mono text-base sm:text-lg font-bold text-white flex items-center gap-1.5 tabular-nums">
                    <TimerIcon
                      className={`size-4 ${
                        isSessionEnded
                          ? "text-amber-400"
                          : "text-emerald-400 animate-pulse"
                      }`}
                    />
                    <span>
                      {isSessionEnded
                        ? "Session Ended"
                        : formatCountdown(activeSession.ends_at, nowMs)}
                    </span>
                  </p>
                </div>
              )}

              {myRow && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {isSessionEnded ? "Your Final Rank" : "Your Best Rank"}
                  </p>
                  <p className="font-display text-lg font-bold text-emerald-400 tabular-nums">
                    {formatOrdinal(myRow.rank)} ({myRow.points} pts)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2.5">
            {!isSessionEnded ? (
              <>
                <Button
                  size="lg"
                  href="/play"
                  className="w-full sm:w-auto px-10 py-4 text-base font-bold inline-flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(255,107,0,0.3)]"
                >
                  <PlayIcon className="size-5 fill-current" />
                  <span>
                    {myRow ? `PLAY AGAIN (Beat ${myRow.points} pts)` : "PLAY NOW"}
                  </span>
                </Button>
                <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {myRow
                      ? `Session Ongoing · Your ${myRow.points} pts Best Score is active`
                      : "Session Ongoing · Unlimited replays for Best Score"}
                  </span>
                </span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    openSessionResultsPopup({
                      sessionId: activeSession?.id,
                      initialTab: "feedback",
                    })
                  }
                  className="w-full sm:w-auto rounded-2xl border border-amber-400/50 bg-amber-500/20 hover:bg-amber-500/30 px-7 py-4 text-sm sm:text-base font-bold text-amber-200 shadow-lg transition-all inline-flex items-center justify-center gap-2.5"
                >
                  <span>🎉 View Session Feedback &amp; Winners</span>
                </button>
                <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold text-slate-400">
                  <span>🔒 Session Ended — Closed for New Entries</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Session Status & Explanation Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-slate-300">
          <div className="flex items-start sm:items-center gap-2.5">
            <span
              className={`mt-1 sm:mt-0 size-2 shrink-0 rounded-full ${
                isSessionEnded ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
              }`}
            />
            {isSessionEnded ? (
              <span>
                <strong className="text-amber-300">Session has ENDED:</strong>{" "}
                Gameplay is now locked. All 10 questions&apos; crowd vote percentages (`10–1 pts`) and official winners are now unlocked.
              </span>
            ) : (
              <span>
                <strong className="text-white">Session is ONGOING:</strong>{" "}
                Rankings and points shift dynamically as more players submit guesses. Official winners &amp; 10–1 crowd vote percentages unlock automatically when the countdown ends.
              </span>
            )}
          </div>
          {previousWinners.length > 0 && (
            <button
              type="button"
              onClick={() =>
                openSessionResultsPopup({
                  sessionId: isSessionEnded
                    ? activeSession?.id
                    : previousSessionId ?? undefined,
                  initialTab: "feedback",
                })
              }
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition-colors"
            >
              <span>
                {isSessionEnded
                  ? `🏁 Open ${activeSession?.name ?? "Session"} Results Popup`
                  : `🏁 View Last Ended Session Results (${previousSessionName})`}
              </span>
            </button>
          )}
        </div>
      </section>

      {/* ── Live / Final Leaderboard (Product Document Page 19 & 27) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-lg font-bold text-white">
              {isSessionEnded ? "Final Session Leaderboard" : "Live Leaderboard"}
            </h2>
            {isSessionEnded ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400" />
                <span>🏁 ENDED · Official Final Standings</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONGOING · Provisional Standings</span>
              </span>
            )}
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
                <th className="py-3 pr-4">
                  {isSessionEnded ? "Official Prize" : "Projected Prize"}
                </th>
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

      {/* ── Live Community Arena & Daily Pulse Preview ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Community Arena &amp; Daily Pulse
              </h2>
              <p className="text-xs text-slate-400">
                Rep your state in live banter and vote on today&apos;s pulse polls
              </p>
            </div>
          </div>

          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent/15 border border-accent/30 px-3.5 py-2 text-xs font-bold text-accent hover:bg-accent/25 transition-colors"
          >
            <span>Enter Arena</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recent Live Banter */}
          <div className="rounded-xl border border-white/[0.06] bg-[#07090e] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Live Banter Room</span>
              <Link href="/community" className="text-accent hover:underline font-semibold">
                Reply live
              </Link>
            </div>
            {arenaPreview.recentChat.length > 0 ? (
              arenaPreview.recentChat.map((m) => (
                <div
                  key={m.id}
                  className="border-t border-white/[0.05] pt-2 first:border-t-0 first:pt-0 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{m.username}</span>
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                      {m.state}
                    </span>
                    {m.rank && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        #{m.rank}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-slate-300">{m.body}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-2">
                Jump into the Live Banter Room and represent your state.
              </p>
            )}
          </div>

          {/* Featured Pulse Poll */}
          <Link
            href="/community"
            className="flex flex-col justify-between rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-[#07090e] p-4 hover:border-amber-500/40 transition-colors"
          >
            <div>
              <span className="inline-block rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {arenaPreview.topPoll?.category || "Daily Pulse Poll"}
              </span>
              <h3 className="mt-2 text-sm font-bold leading-snug text-white">
                {arenaPreview.topPoll?.title ||
                  "Vote on today's Nigerian consumer & city rivalry polls"}
              </h3>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {arenaPreview.topPoll
                  ? `${arenaPreview.topPoll.totalVotes.toLocaleString()} votes cast`
                  : "Live state breakdown"}
              </span>
              <span className="font-bold text-amber-300">Cast your vote →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Previous Session Winners (Product Document Page 20, 32 & 33) ── */}
      {previousWinners.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <TrophyIcon className="size-4 text-amber-400" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-white">
                    Previous Session Winners
                  </h2>
                  <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    🏁 ENDED SESSION · Official Final Results
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Top 3 Official Winners · {previousSessionName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  openSessionResultsPopup({
                    sessionId: previousSessionId ?? undefined,
                    initialTab: "feedback",
                  })
                }
                className="rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors"
              >
                🎉 View Ended Session Feedback &amp; Winners
              </button>
              <Link
                href="/leaderboard?tab=winners"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <span>Winners Board</span>
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
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
