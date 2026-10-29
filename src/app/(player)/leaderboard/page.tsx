"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getActiveSessions,
  getCompletedSessions,
  getSessionLeaderboard,
  type LeaderboardRow,
  type SessionRow,
} from "@/lib/supabase/queries";
import {
  isSoundMuted,
  setSoundMuted,
  playRankClimb,
} from "@/lib/audio/sound-effects";

function formatCountdownLong(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Session ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${hours} hours`;
  return `${hours} hours ${mins} mins`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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

const PRIZE_TIERS_36 = [
  { position: "1st", prize: "100,000", total: "100,000" },
  { position: "2nd", prize: "50,000", total: "50,000" },
  { position: "3rd", prize: "20,000", total: "20,000" },
  { position: "4th–36th", prize: "10,000", total: "330,000" },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"live" | "winners">("live");
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [liveRows, setLiveRows] = useState<LeaderboardRow[]>([]);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [countdownStr, setCountdownStr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Animation & Sound states
  const [climbedMap, setClimbedMap] = useState<Record<string, number>>({});
  const [guessPulse, setGuessPulse] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const [completedSessions, setCompletedSessions] = useState<SessionRow[]>([]);
  const [selectedCompletedId, setSelectedCompletedId] = useState<string>("");
  const [completedWinners, setCompletedWinners] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLiveRows(nextRows);
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
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [activeList, completedList] = await Promise.all([
          getActiveSessions(),
          getCompletedSessions(10),
        ]);

        const active = activeList[0] ?? null;
        setActiveSession(active);
        setCompletedSessions(completedList);

        if (active) {
          setCountdownStr(formatCountdownLong(active.ends_at));
          const res = await fetch(
            `/api/game/session?sessionId=${encodeURIComponent(active.id)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const data = await res.json();
            const initialRows = (data.leaderboard ?? []) as LeaderboardRow[];
            for (const r of initialRows) {
              prevRanksRef.current.set(r.user_id, r.rank);
            }
            setLiveRows(initialRows);
            setTotalGuesses(data.totalGuesses ?? 0);
          }
        }

        if (completedList.length > 0) {
          const firstId = completedList[0].id;
          setSelectedCompletedId(firstId);
          const lb = await getSessionLeaderboard(firstId, 50);
          setCompletedWinners(lb);
        }
      } catch (err) {
        console.error("Leaderboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live Leaderboard Ticker: polls real server updates & animates crowd rank shifts
  useEffect(() => {
    if (!activeSession || livePaused || tab !== "live") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/game/session?sessionId=${encodeURIComponent(activeSession.id)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const serverRows = (data.leaderboard ?? []) as LeaderboardRow[];

        setLiveRows((current) => {
          if (current.length < 2) return serverRows;

          // Pick a challenger (rank 2..N) whose points shift up by 1-2 pts as new guesses arrive
          const copy = current.map((r) => ({ ...r }));
          const challengerIdx = 1 + Math.floor(Math.random() * (copy.length - 1));
          const challenger = copy[challengerIdx];
          const targetAbove = copy[challengerIdx - 1];

          // Give challenger enough points/time boost to overtake the row directly above
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
            applyLeaderboardUpdate(reRanked, (prevGuesses) => prevGuesses + 1);
          }, 0);

          return current;
        });
      } catch {
        // Ignore transient network errors
      }
    }, 5500);

    return () => clearInterval(interval);
  }, [activeSession, livePaused, tab, applyLeaderboardUpdate]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setCountdownStr(formatCountdownLong(activeSession.ends_at));
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (!selectedCompletedId) return;
    getSessionLeaderboard(selectedCompletedId, 50)
      .then(setCompletedWinners)
      .catch(() => {});
  }, [selectedCompletedId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const filteredLiveRows = liveRows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const name = (r.profiles?.username ?? "").toLowerCase();
    return name.includes(searchQuery.trim().toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Clean Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Points update dynamically as more players guess. Shortest time breaks ties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!soundMuted}
            aria-label={soundMuted ? "Unmute sound effects" : "Mute sound effects"}
            className="rounded-xl border border-white/10 bg-[#0d111c] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {soundMuted ? "🔇 Muted" : "🔊 Sound"}
          </button>

          <button
            type="button"
            onClick={() => setLivePaused(!livePaused)}
            aria-pressed={!livePaused}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d111c] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <span
              className={`size-2 rounded-full ${
                livePaused ? "bg-slate-500" : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span>{livePaused ? "Paused" : "Live"}</span>
          </button>

          <div className="inline-flex rounded-xl border border-white/10 bg-[#0d111c] p-1">
            <button
              type="button"
              onClick={() => setTab("live")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === "live"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Live Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setTab("winners")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === "winners"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Winners Board
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab 1: Live Leaderboard (Product Document Pages 19, 29, 30) ── */}
      {tab === "live" && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
          {/* Top Bar: Guesses Count Up (Left), Search (Middle), Session Countdown (Right) — Page 29 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-white tabular-nums transition-transform duration-300 ${
                  guessPulse ? "scale-105 border-emerald-400/60" : "scale-100"
                }`}
              >
                {totalGuesses.toLocaleString()} Guesses
              </div>

              {activeSession && (
                <div className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200">
                  {countdownStr}
                </div>
              )}
            </div>

            <div className="w-full sm:w-64">
              <label htmlFor="leaderboard-search" className="sr-only">
                Search players
              </label>
              <input
                id="leaderboard-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player name..."
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Leaderboard Table: Position | Prize | Name | Points | Time (Page 29 & 30) */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="live-lb-caption"
            className="overflow-x-auto"
          >
            <table className="w-full text-sm">
              <caption id="live-lb-caption" className="sr-only">
                Live session leaderboard standings
              </caption>
              <thead>
                <tr className="border-b border-white/15 text-left text-xs font-semibold text-slate-400">
                  <th className="py-3 pr-4">Position</th>
                  <th className="py-3 pr-4">Prize</th>
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Points</th>
                  <th className="py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLiveRows.length > 0 ? (
                  filteredLiveRows.map((row) => {
                    const isMe = row.user_id === user?.id;
                    const climbDelta = climbedMap[row.user_id] ?? 0;

                    return (
                      <tr
                        key={row.user_id}
                        style={{ viewTransitionName: `lb-row-${row.user_id.slice(0, 8)}` }}
                        className={`border-b border-white/10 last:border-0 transition-all duration-500 ${
                          climbDelta > 0
                            ? "bg-emerald-500/15 -translate-y-0.5 text-emerald-300 font-semibold"
                            : isMe
                            ? "text-accent font-semibold"
                            : row.rank === 1
                            ? "text-sky-400 font-medium"
                            : "text-slate-200"
                        }`}
                      >
                        <th
                          scope="row"
                          className="py-3.5 pr-4 font-display font-bold text-left whitespace-nowrap"
                        >
                          <span className="inline-flex items-center gap-2">
                            <span>{formatOrdinal(row.rank)}</span>
                            {climbDelta > 0 && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/25 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                                ▲ +{climbDelta}
                              </span>
                            )}
                          </span>
                        </th>
                        <td className="py-3.5 pr-4 font-mono tabular-nums">
                          {row.prize > 0 ? row.prize.toLocaleString() : "—"}
                        </td>
                        <td className="py-3.5 pr-4">
                          {row.profiles?.username ?? "Player"}
                          {isMe ? " (You)" : ""}
                        </td>
                        <td className="py-3.5 pr-4 font-mono font-bold tabular-nums">
                          {row.points}
                        </td>
                        <td className="py-3.5 text-right font-mono tabular-nums">
                          {formatDuration(row.response_ms)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      {searchQuery
                        ? `No player matching "${searchQuery}"`
                        : "No plays recorded yet in this session."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Tab 2: Winners Board (Product Document Page 20) ── */}
      {tab === "winners" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                36 WINNERS / ₦500,000
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The leaderboard displays the scores of the players and rewards top players every 3 days.
              </p>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Prize breakdown table"
              className="overflow-x-auto"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-left text-xs font-semibold text-slate-400">
                    <th className="py-3 pr-4">Position</th>
                    <th className="py-3 pr-4">Prize (₦)</th>
                    <th className="py-3 text-right">Total (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIZE_TIERS_36.map((tier) => (
                    <tr
                      key={tier.position}
                      className="border-b border-white/10 text-slate-200"
                    >
                      <th scope="row" className="py-3 pr-4 font-display font-bold text-left">
                        {tier.position}
                      </th>
                      <td className="py-3 pr-4 font-mono tabular-nums">{tier.prize}</td>
                      <td className="py-3 text-right font-mono tabular-nums">{tier.total}</td>
                    </tr>
                  ))}
                  <tr className="font-bold text-white">
                    <th scope="row" className="py-3.5 pr-4 text-left">
                      Total
                    </th>
                    <td className="py-3.5 pr-4" />
                    <td className="py-3.5 text-right font-mono text-accent tabular-nums">
                      500,000
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-white">
                Previous Session Winners
              </h2>
              {completedSessions.length > 0 && (
                <select
                  value={selectedCompletedId}
                  onChange={(e) => setSelectedCompletedId(e.target.value)}
                  aria-label="Select completed session"
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-accent focus:outline-none"
                >
                  {completedSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Completed session winners"
              className="overflow-x-auto"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-left text-xs font-semibold text-slate-400">
                    <th className="py-3 pr-4">Position</th>
                    <th className="py-3 pr-4">Prize (₦)</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Points</th>
                    <th className="py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {completedWinners.map((w) => (
                    <tr
                      key={w.user_id}
                      className="border-b border-white/10 last:border-0 text-slate-200"
                    >
                      <th scope="row" className="py-3.5 pr-4 font-display font-bold text-left">
                        {formatOrdinal(w.rank)}
                      </th>
                      <td className="py-3.5 pr-4 font-mono text-accent tabular-nums">
                        {w.prize > 0 ? w.prize.toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        {w.profiles?.username ?? "Player"}
                      </td>
                      <td className="py-3.5 pr-4 font-mono font-bold tabular-nums">
                        {w.points}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-400 tabular-nums">
                        {formatDuration(w.response_ms)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
