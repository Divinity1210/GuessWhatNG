"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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

const PRIZE_TIERS_36 = [
  { position: "1st", winners: "1 Winner", prize: "100,000", total: "100,000" },
  { position: "2nd", winners: "1 Winner", prize: "50,000", total: "50,000" },
  { position: "3rd", winners: "1 Winner", prize: "20,000", total: "20,000" },
  { position: "4th–36th", winners: "33 Winners", prize: "10,000", total: "330,000" },
];

type QuickFilter = "all" | "podium" | "prize_zone" | "club_80" | "fastest";
type SortBy = "rank" | "fastest" | "points";

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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("rank");

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
        setTotalGuesses(data.totalGuesses ?? 0);
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setAllSessions(data.sessions as SessionRow[]);
        }
        return;
      }
      const fallbackRows = await getSessionLeaderboard(sessionId, 50);
      setLiveRows(fallbackRows);
      setTotalGuesses(0);
    } catch {
      const fallbackRows = await getSessionLeaderboard(sessionId, 50);
      setLiveRows(fallbackRows);
      setTotalGuesses(0);
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

  // Real Live Leaderboard Polling (100% Real Server Updates, Zero Simulation)
  useEffect(() => {
    if (!activeSession || !isViewingActive || livePaused || tab !== "live") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/game/session?sessionId=${encodeURIComponent(activeSession.id)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const serverRows = (data.leaderboard ?? []) as LeaderboardRow[];
        applyLeaderboardUpdate(serverRows, data.totalGuesses ?? 0);
      } catch {
        // Ignore transient network errors
      }
    }, 4000);

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

  // Visual Analytics Calculations from Real Session Rows
  const analytics = useMemo(() => {
    const myEntry = liveRows.find((r) => r.user_id === user?.id);
    const leaderEntry = liveRows[0] ?? null;
    const displayScore = myEntry ? myEntry.points : (leaderEntry?.points ?? 0);
    const displayLabel = myEntry ? "Your Best Score" : "Top Leader Score";
    const displaySub = myEntry
      ? `Rank ${formatOrdinal(myEntry.rank)} · ${formatDuration(myEntry.response_ms)}`
      : leaderEntry
      ? `@${leaderEntry.profiles?.username ?? "Leader"} · ${formatDuration(leaderEntry.response_ms)}`
      : "No completed runs yet";

    const buckets = [
      { label: "90–100", count: 0, color: "from-emerald-400 to-teal-500" },
      { label: "80–89", count: 0, color: "from-amber-400 to-orange-500" },
      { label: "70–79", count: 0, color: "from-sky-400 to-indigo-500" },
      { label: "<70", count: 0, color: "from-slate-500 to-slate-600" },
    ];

    let totalPoints = 0;
    let fastestMs = Infinity;

    for (const r of liveRows) {
      totalPoints += r.points;
      if (r.response_ms > 0 && r.response_ms < fastestMs) {
        fastestMs = r.response_ms;
      }
      if (r.points >= 90) buckets[0].count += 1;
      else if (r.points >= 80) buckets[1].count += 1;
      else if (r.points >= 70) buckets[2].count += 1;
      else buckets[3].count += 1;
    }

    const maxBucket = Math.max(1, ...buckets.map((b) => b.count));
    const avgScore = liveRows.length > 0 ? Math.round(totalPoints / liveRows.length) : 0;
    const cutoffRow = liveRows[Math.min(35, Math.max(0, liveRows.length - 1))];
    const cutoffPts = cutoffRow ? cutoffRow.points : 0;

    return {
      displayScore: Math.min(100, Math.max(0, displayScore)),
      displayLabel,
      displaySub,
      buckets,
      maxBucket,
      avgScore,
      fastestStr: fastestMs < Infinity ? formatDuration(fastestMs) : "—",
      cutoffPts,
    };
  }, [liveRows, user?.id]);

  // Filtered and Sorted Live Rows
  const filteredLiveRows = useMemo(() => {
    const base = liveRows.filter((r) => {
      if (searchQuery.trim()) {
        const name = (r.profiles?.username ?? "").toLowerCase();
        if (!name.includes(searchQuery.trim().toLowerCase())) return false;
      }
      if (quickFilter === "podium") return r.rank <= 3;
      if (quickFilter === "prize_zone") return r.rank <= 36;
      if (quickFilter === "club_80") return r.points >= 80;
      if (quickFilter === "fastest") return r.response_ms <= 30_000;
      return true;
    });

    const sorted = [...base];
    if (sortBy === "fastest") {
      sorted.sort((a, b) => a.response_ms - b.response_ms);
    } else if (sortBy === "points") {
      sorted.sort((a, b) => b.points - a.points || a.response_ms - b.response_ms);
    } else {
      sorted.sort((a, b) => a.rank - b.rank);
    }
    return sorted;
  }, [liveRows, searchQuery, quickFilter, sortBy]);

  const filteredCompletedWinners = completedWinners.filter((r) => {
    if (!searchQuery.trim()) return true;
    const name = (r.profiles?.username ?? "").toLowerCase();
    return name.includes(searchQuery.trim().toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Clean Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Leaderboard &amp; Winners Board
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Each player&apos;s Best Score is retained on the leaderboard. Shortest cumulative time breaks ties.
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
              <span>{livePaused ? "Paused" : "Live Sync"}</span>
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
        <div className="space-y-5">
          {/* ── 3-Card Visual Analytics Strip ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Circular Best Score Progress Ring */}
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex items-center gap-5">
              <div
                className="relative grid size-20 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#F7911B ${analytics.displayScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <div className="grid size-15 place-items-center rounded-full bg-[#0d111c] text-center">
                  <span className="font-display text-lg font-extrabold text-white tabular-nums leading-none">
                    {analytics.displayScore}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">
                    / 100
                  </span>
                </div>
                <progress
                  className="sr-only"
                  max={100}
                  value={analytics.displayScore}
                >
                  {analytics.displayScore}%
                </progress>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  {analytics.displayLabel}
                </p>
                <p className="font-display text-base font-bold text-white truncate">
                  {analytics.displaySub}
                </p>
                <p className="text-xs text-slate-400">
                  Best attempt retained automatically
                </p>
              </div>
            </div>

            {/* Card 2: Session Score Distribution Bar Chart */}
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Score Distribution
                </p>
                <span className="text-xs font-mono text-slate-300">
                  {liveRows.length} Players
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 items-end h-16 pt-2">
                {analytics.buckets.map((b) => {
                  const pct = Math.max(12, Math.round((b.count / analytics.maxBucket) * 100));
                  return (
                    <div key={b.label} className="flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] font-mono font-bold text-slate-300">
                        {b.count}
                      </span>
                      <div className="w-full bg-white/[0.04] rounded-t-md h-10 flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-t-md bg-gradient-to-t ${b.color} transition-all duration-500`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Speed vs Consensus Telemetry */}
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Speed vs Consensus Split
                </p>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Real-Time
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
                  <p className="text-[10px] uppercase text-slate-400">Fastest Run</p>
                  <p className="font-mono text-sm font-bold text-emerald-400 mt-0.5 tabular-nums">
                    {analytics.fastestStr}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
                  <p className="text-[10px] uppercase text-slate-400">Avg Points</p>
                  <p className="font-mono text-sm font-bold text-white mt-0.5 tabular-nums">
                    {analytics.avgScore} pts
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
                  <p className="text-[10px] uppercase text-slate-400">Rank #36 Cut</p>
                  <p className="font-mono text-sm font-bold text-accent mt-0.5 tabular-nums">
                    {analytics.cutoffPts} pts
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
            {/* Top Bar: Guesses Count Up (Left), Session Status/Countdown (Middle), Search & Sort (Right) — Page 27 */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="w-full sm:w-56">
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

                <label htmlFor="leaderboard-sort" className="sr-only">
                  Sort leaderboard
                </label>
                <select
                  id="leaderboard-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="rounded-xl border border-white/15 bg-[#07090e] px-3 py-2 text-xs font-semibold text-slate-200 focus:border-accent focus:outline-none"
                >
                  <option value="rank">Sort: Best Rank (Default)</option>
                  <option value="points">Sort: Highest Points</option>
                  <option value="fastest">Sort: Fastest Time</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
              {(
                [
                  { id: "all", label: `All Players (${liveRows.length})` },
                  { id: "podium", label: "Top 3 Podium" },
                  { id: "prize_zone", label: "Prize Zone (Top 36)" },
                  { id: "club_80", label: "80+ Pts Club" },
                  { id: "fastest", label: "Fastest (<30s)" },
                ] as { id: QuickFilter; label: string }[]
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setQuickFilter(pill.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${
                    quickFilter === pill.id
                      ? "border-accent bg-accent/20 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Leaderboard Table: Position | Prize | Name | Best Points | Best Time (Page 27 & 28) */}
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
                    <th className="py-3 pr-4">Best Points</th>
                    <th className="py-3 text-right">Best Time</th>
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
                        {searchQuery || quickFilter !== "all"
                          ? "No players match the current filter."
                          : "No plays recorded yet in this session."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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
