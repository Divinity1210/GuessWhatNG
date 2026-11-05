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
  { position: "1st", winners: "1 Winner", prize: "100,000", total: "100,000" },
  { position: "2nd", winners: "1 Winner", prize: "50,000", total: "50,000" },
  { position: "3rd", winners: "1 Winner", prize: "20,000", total: "20,000" },
  { position: "4th–36th", winners: "33 Winners", prize: "10,000", total: "330,000" },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"live" | "winners" | "prizes">("live");
  const [allSessions, setAllSessions] = useState<SessionRow[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
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
  const [switchingSession, setSwitchingSession] = useState(false);

  useEffect(() => {
    setSoundMutedState(isSoundMuted());
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "winners" || tabParam === "prizes") {
        setTab(tabParam);
      }
    }
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

  const loadSessionStandings = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setSwitchingSession(true);
    try {
      const res = await fetch(
        `/api/game/session?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        const rows = (data.leaderboard ?? []) as LeaderboardRow[];
        prevRanksRef.current.clear();
        for (const r of rows) {
          prevRanksRef.current.set(r.user_id, r.rank);
        }
        setLiveRows(rows);
        setTotalGuesses(data.totalGuesses ?? rows.length * 10);
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setAllSessions(data.sessions as SessionRow[]);
        }
        return;
      }
      const fallbackRows = await getSessionLeaderboard(sessionId, 50);
      setLiveRows(fallbackRows);
      setTotalGuesses(fallbackRows.length * 10);
    } catch {
      const fallbackRows = await getSessionLeaderboard(sessionId, 50);
      setLiveRows(fallbackRows);
      setTotalGuesses(fallbackRows.length * 10);
    } finally {
      setSwitchingSession(false);
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

        const combined: SessionRow[] = [];
        for (const s of [...activeList, ...completedList]) {
          if (!combined.some((x) => x.id === s.id)) {
            combined.push(s);
          }
        }
        setAllSessions(combined);

        const defaultSession = active ?? completedList[0] ?? null;
        if (defaultSession) {
          setSelectedSessionId(defaultSession.id);
          if (defaultSession.status === "active") {
            setCountdownStr(formatCountdownLong(defaultSession.ends_at));
          }
          await loadSessionStandings(defaultSession.id);
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
  }, [loadSessionStandings]);

  const selectedSession =
    allSessions.find((s) => s.id === selectedSessionId) ?? activeSession;
  const isViewingActive =
    !selectedSession || selectedSession.status === "active";

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const target = allSessions.find((s) => s.id === sessionId);
    if (target && target.status === "completed") {
      setSelectedCompletedId(sessionId);
    }
    await loadSessionStandings(sessionId);
  };

  // Live Leaderboard Ticker: polls real server updates & animates crowd rank shifts on active session
  useEffect(() => {
    if (!activeSession || !isViewingActive || livePaused || tab !== "live") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/game/session?sessionId=${encodeURIComponent(activeSession.id)}`,
          { cache: "no-store", priority: "low" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const serverRows = (data.leaderboard ?? []) as LeaderboardRow[];
        applyLeaderboardUpdate(
          serverRows,
          data.totalGuesses ?? serverRows.length * 10,
        );
      } catch {
        // Ignore transient network errors
      }
    }, 5500);

    return () => clearInterval(interval);
  }, [activeSession, isViewingActive, livePaused, tab, applyLeaderboardUpdate]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setCountdownStr(formatCountdownLong(activeSession.ends_at));
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (!selectedCompletedId) return;
    fetch(`/api/game/session?sessionId=${encodeURIComponent(selectedCompletedId)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.leaderboard && data.leaderboard.length > 0) {
          setCompletedWinners(data.leaderboard as LeaderboardRow[]);
        } else {
          return getSessionLeaderboard(selectedCompletedId, 50).then(setCompletedWinners);
        }
      })
      .catch(() => {
        getSessionLeaderboard(selectedCompletedId, 50)
          .then(setCompletedWinners)
          .catch(() => {});
      });
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

  const filteredCompletedWinners = completedWinners.filter((r) => {
    if (!searchQuery.trim()) return true;
    const name = (r.profiles?.username ?? "").toLowerCase();
    return name.includes(searchQuery.trim().toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Clean Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Leaderboard &amp; Winners Board
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Points update dynamically as more players guess. Shortest cumulative time breaks ties.
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

          {isViewingActive && tab === "live" && (
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
          )}

          <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#0d111c] p-1">
            <button
              type="button"
              onClick={() => setTab("live")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
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
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === "winners"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Winners Board
            </button>
            <button
              type="button"
              onClick={() => setTab("prizes")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === "prizes"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Prize Table (36 Winners / ₦500k)
            </button>
          </div>
        </div>
      </div>

      {/* ── Session-to-Session Switcher Bar (Pages 19, 20, 27, 28) ── */}
      {allSessions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Session Switcher:
            </span>
            {allSessions.map((sess) => {
              const isSelected =
                tab === "winners"
                  ? selectedCompletedId === sess.id
                  : selectedSessionId === sess.id;
              const isLive = sess.status === "active";

              return (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => {
                    if (tab === "winners" && sess.status === "completed") {
                      setSelectedCompletedId(sess.id);
                    } else {
                      if (tab === "prizes") setTab("live");
                      handleSelectSession(sess.id);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-accent/15 border-accent text-white shadow-sm"
                      : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  <span>{sess.name}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                      isLive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {isLive ? "Live" : "Completed"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="session-select-dropdown" className="sr-only">
              Select Session
            </label>
            <select
              id="session-select-dropdown"
              value={tab === "winners" ? selectedCompletedId : selectedSessionId}
              onChange={(e) => {
                const val = e.target.value;
                if (tab === "winners") {
                  setSelectedCompletedId(val);
                } else {
                  handleSelectSession(val);
                }
              }}
              className="rounded-xl border border-white/15 bg-[#07090e] px-3 py-2 text-xs font-medium text-white focus:border-accent focus:outline-none"
            >
              {allSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === "active" ? "LIVE" : "Completed"})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Tab 1: Live / Selected Session Leaderboard (Product Document Pages 19, 27, 28, 32) ── */}
      {tab === "live" && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
          {/* Top Bar: Guesses Count Up (Left), Session Status/Countdown (Middle), Search (Right) — Page 27 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-white tabular-nums transition-transform duration-300 ${
                  guessPulse ? "scale-105 border-emerald-400/60" : "scale-100"
                }`}
              >
                {totalGuesses.toLocaleString()} Guesses
              </div>

              {selectedSession && (
                <div className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      selectedSession.status === "active"
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-amber-400"
                    }`}
                  />
                  <span>
                    {selectedSession.status === "active"
                      ? countdownStr || formatCountdownLong(selectedSession.ends_at)
                      : `Completed · ${selectedSession.name}`}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setTab("prizes")}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                🏆 36 Winners / ₦500,000
              </button>
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

          {/* Leaderboard Table: Position | Prize | Name | Points | Time (Page 27 & 28) */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="live-lb-caption"
            className={`overflow-x-auto transition-opacity ${
              switchingSession ? "opacity-50" : "opacity-100"
            }`}
          >
            <table className="w-full text-sm">
              <caption id="live-lb-caption" className="sr-only">
                Session leaderboard standings
              </caption>
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
                          {row.prize > 0 ? `₦${row.prize.toLocaleString()}` : "—"}
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

      {/* ── Tab 2: Winners Board (Session-to-Session Completed Winners + Page 20 Payouts) ── */}
      {tab === "winners" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Previous Session Winners
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Switch between completed sessions to inspect verified winners and payouts.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search winner..."
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                />
                {completedSessions.length > 0 && (
                  <select
                    value={selectedCompletedId}
                    onChange={(e) => setSelectedCompletedId(e.target.value)}
                    aria-label="Select completed session"
                    className="rounded-xl border border-white/15 bg-[#07090e] px-3.5 py-2 text-xs text-white focus:border-accent focus:outline-none"
                  >
                    {completedSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
                  {filteredCompletedWinners.length > 0 ? (
                    filteredCompletedWinners.map((w) => (
                      <tr
                        key={w.user_id}
                        className="border-b border-white/10 last:border-0 text-slate-200"
                      >
                        <th scope="row" className="py-3.5 pr-4 font-display font-bold text-left">
                          {formatOrdinal(w.rank)}
                        </th>
                        <td className="py-3.5 pr-4 font-mono text-accent font-semibold tabular-nums">
                          {w.prize > 0 ? `₦${w.prize.toLocaleString()}` : "—"}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        No winners matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Also display the 36 Winners / ₦500,000 Payout Table below */}
          <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                36 WINNERS / ₦500,000 PRIZE STRUCTURE
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The leaderboard displays the scores of the players and rewards the top 36 players every 3 days.
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
                    <th className="py-3 pr-4">Winners</th>
                    <th className="py-3 pr-4">Prize Per Winner (₦)</th>
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
                      <td className="py-3 pr-4 text-slate-400">{tier.winners}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">₦{tier.prize}</td>
                      <td className="py-3 text-right font-mono tabular-nums">₦{tier.total}</td>
                    </tr>
                  ))}
                  <tr className="font-bold text-white">
                    <th scope="row" className="py-3.5 pr-4 text-left">
                      Total (36 Winners)
                    </th>
                    <td className="py-3.5 pr-4 text-slate-400">36 Winners</td>
                    <td className="py-3.5 pr-4" />
                    <td className="py-3.5 text-right font-mono text-accent tabular-nums">
                      ₦500,000
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 3: Prize Table (Product Document Page 20) ── */}
      {tab === "prizes" && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                36 WINNERS / ₦500,000
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every 3-day session rewards the top 36 players based on highest points and shortest completion time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab("live")}
              className="self-start sm:self-auto rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-accent hover:bg-white/[0.08] transition-colors"
            >
              ← Back to Live Standings
            </button>
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
                  <th className="py-3 pr-4">Winners</th>
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
                    <th scope="row" className="py-3.5 pr-4 font-display font-bold text-left">
                      {tier.position}
                    </th>
                    <td className="py-3.5 pr-4 text-slate-400">{tier.winners}</td>
                    <td className="py-3.5 pr-4 font-mono tabular-nums">₦{tier.prize}</td>
                    <td className="py-3.5 text-right font-mono tabular-nums">₦{tier.total}</td>
                  </tr>
                ))}
                <tr className="font-bold text-white">
                  <th scope="row" className="py-3.5 pr-4 text-left">
                    Total
                  </th>
                  <td className="py-3.5 pr-4 text-slate-400">36 Winners</td>
                  <td className="py-3.5 pr-4" />
                  <td className="py-3.5 text-right font-mono text-accent tabular-nums">
                    ₦500,000
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
