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
import { openSessionResultsPopup } from "@/components/game/SessionResultsPopup";
import {
  BarChartIcon,
  TrophyIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/ui/Icons";

function formatCountdownLong(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Session ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s left`;
  }
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s left`;
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
    setCountdownStr(formatCountdownLong(activeSession.ends_at));
    const interval = setInterval(() => {
      setCountdownStr(formatCountdownLong(activeSession.ends_at));
    }, 1000);
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

  const activeStructure =
    Array.isArray(selectedSession?.prize_structure) &&
    selectedSession.prize_structure.length > 0
      ? selectedSession.prize_structure
      : [
          { rank_from: 1, rank_to: 1, amount: 100000 },
          { rank_from: 2, rank_to: 2, amount: 50000 },
          { rank_from: 3, rank_to: 3, amount: 20000 },
          { rank_from: 4, rank_to: 36, amount: 10000 },
        ];

  const dynamicPrizeTiers = activeStructure.map((t) => {
    const fromRank = Number(t.rank_from ?? 1);
    const toRank = Number(t.rank_to ?? fromRank);
    const count = Math.max(1, toRank - fromRank + 1);
    const amt = Number(t.amount ?? 0);
    return {
      position:
        fromRank === toRank
          ? formatOrdinal(fromRank)
          : `${formatOrdinal(fromRank)} to ${formatOrdinal(toRank)}`,
      winners: `${count} Winner${count > 1 ? "s" : ""}`,
      count,
      prize: amt.toLocaleString(),
      total: (count * amt).toLocaleString(),
      totalNum: count * amt,
    };
  });

  const dynamicTotalWinners = Math.max(
    ...activeStructure.map((t) => Number(t.rank_to ?? 0)),
    36
  );
  const dynamicTotalPool =
    Number(selectedSession?.prize_pool ?? 0) > 0
      ? Number(selectedSession?.prize_pool)
      : dynamicPrizeTiers.reduce((s, t) => s + t.totalNum, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Leaderboard &amp; Winners
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by live crowd points first, then fastest total time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openSessionResultsPopup({
                  sessionId: selectedCompletedId || undefined,
                  initialTab: tab === "winners" ? "winners" : "feedback",
                })
              }
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/12 hover:bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors"
            >
              <BarChartIcon className="size-3.5" />
              <span>Crowd Breakdown</span>
            </button>

            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!soundMuted}
              aria-label={soundMuted ? "Unmute sound effects" : "Mute sound effects"}
              className="inline-flex size-10 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#0d111c] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {soundMuted ? (
                <VolumeMuteIcon className="size-4 text-slate-400" />
              ) : (
                <VolumeIcon className="size-4 text-accent" />
              )}
              <span className="hidden sm:inline">{soundMuted ? "Muted" : "Sound"}</span>
            </button>

            {isViewingActive && tab === "live" && (
              <button
                type="button"
                onClick={() => setLivePaused(!livePaused)}
                aria-pressed={!livePaused}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0d111c] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <span
                  className={`size-2 rounded-full ${
                    livePaused ? "bg-slate-500" : "bg-emerald-400"
                  }`}
                />
                <span>{livePaused ? "Paused" : "Live"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile-First 3-Tab Segmented Bar */}
        <div className="grid grid-cols-3 sm:inline-flex sm:w-fit rounded-xl border border-white/10 bg-[#0d111c] p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              tab === "live"
                ? "bg-accent text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setTab("winners")}
            className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              tab === "winners"
                ? "bg-accent text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Winners
          </button>
          <button
            type="button"
            onClick={() => setTab("prizes")}
            className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              tab === "prizes"
                ? "bg-accent text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Prizes ({dynamicTotalWinners})
          </button>
        </div>
      </div>

      {/* Session Switcher */}
      {allSessions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Session:
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
                      void handleSelectSession(sess.id);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-accent/15 border-accent text-white"
                      : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isLive ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span>{sess.name}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full sm:w-auto shrink-0">
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
                  void handleSelectSession(val);
                }
              }}
              className="min-h-11 w-full sm:w-auto rounded-xl border border-white/15 bg-[#07090e] px-3.5 py-2 text-base sm:text-xs font-medium text-white focus:border-accent focus:outline-none"
            >
              {allSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === "active" ? "Live" : "Ended"})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tab 1: Live / Selected Session Standings */}
      {tab === "live" && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
              <div
                className={`font-semibold tabular-nums transition-colors ${
                  guessPulse ? "text-emerald-400" : "text-white"
                }`}
              >
                <span className="font-display text-base font-bold">
                  {totalGuesses.toLocaleString()}
                </span>{" "}
                <span className="text-xs font-normal text-slate-400">Guesses</span>
              </div>

              {selectedSession && (
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 text-xs text-slate-300">
                  <span
                    className={`size-2 rounded-full ${
                      selectedSession.status === "active"
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="font-mono tabular-nums">
                    {selectedSession.status === "active"
                      ? countdownStr || formatCountdownLong(selectedSession.ends_at)
                      : `Closed · ${selectedSession.name}`}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setTab("prizes")}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                <TrophyIcon className="size-3.5" />
                <span>₦{dynamicTotalPool.toLocaleString()} Pool</span>
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
                placeholder="Search player..."
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2 text-base sm:text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Mobile Compact Standings (<640px) */}
          <div
            className={`space-y-2 sm:hidden transition-opacity ${
              switchingSession ? "opacity-50" : "opacity-100"
            }`}
          >
            {filteredLiveRows.length > 0 ? (
              filteredLiveRows.map((row) => {
                const isMe = row.user_id === user?.id;
                const climbDelta = climbedMap[row.user_id] ?? 0;
                return (
                  <div
                    key={row.user_id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                      climbDelta > 0
                        ? "border-emerald-500/35 bg-emerald-500/12"
                        : isMe
                        ? "border-accent/35 bg-accent/10"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg font-display text-xs font-bold ${
                          row.rank === 1
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                            : row.rank <= 3
                            ? "bg-white/[0.08] text-white"
                            : "bg-white/[0.04] text-slate-300"
                        }`}
                      >
                        {formatOrdinal(row.rank)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {row.profiles?.username ?? "Player"}
                          {isMe ? " (You)" : ""}
                        </p>
                        <p className="font-mono text-xs text-slate-400 tabular-nums">
                          {row.points} pts · {formatDuration(row.response_ms)}
                          {climbDelta > 0 ? ` · +${climbDelta}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums shrink-0">
                      {row.prize > 0 ? `₦${row.prize.toLocaleString()}` : "-"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {searchQuery
                  ? `No player matching "${searchQuery}"`
                  : "No plays recorded in this session yet."}
              </p>
            )}
          </div>

          {/* Desktop Standings Table (>=640px) */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="live-lb-caption"
            className={`hidden sm:block overflow-x-auto transition-opacity ${
              switchingSession ? "opacity-50" : "opacity-100"
            }`}
          >
            <table className="w-full text-sm">
              <caption id="live-lb-caption" className="sr-only">
                Session leaderboard standings
              </caption>
              <thead>
                <tr className="border-b border-white/15 text-left text-xs font-semibold text-slate-400">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 pr-4">
                    {selectedSession?.status === "active"
                      ? "Projected Prize (₦)"
                      : "Official Prize (₦)"}
                  </th>
                  <th className="py-3 pr-4">Player</th>
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
                            ? "text-amber-300 font-medium"
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
                                +{climbDelta}
                              </span>
                            )}
                          </span>
                        </th>
                        <td className="py-3.5 pr-4 font-mono text-emerald-400 tabular-nums">
                          {row.prize > 0 ? `₦${row.prize.toLocaleString()}` : "-"}
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
                        : "No plays recorded in this session yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 2: Winners Board */}
      {tab === "winners" && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Completed Session Winners
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified rankings and cash payouts from ended sessions.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search winner..."
                  className="min-h-11 rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2 text-base sm:text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                />
                {completedSessions.length > 0 && (
                  <select
                    value={selectedCompletedId}
                    onChange={(e) => setSelectedCompletedId(e.target.value)}
                    aria-label="Select completed session"
                    className="min-h-11 rounded-xl border border-white/15 bg-[#07090e] px-3.5 py-2 text-base sm:text-xs text-white focus:border-accent focus:outline-none"
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

            {/* Mobile Winners Cards */}
            <div className="space-y-2 sm:hidden">
              {filteredCompletedWinners.length > 0 ? (
                filteredCompletedWinners.map((w) => (
                  <div
                    key={w.user_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] font-display text-xs font-bold text-white">
                        {formatOrdinal(w.rank)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {w.profiles?.username ?? "Player"}
                        </p>
                        <p className="font-mono text-xs text-slate-400 tabular-nums">
                          {w.points} pts · {formatDuration(w.response_ms)}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-accent tabular-nums shrink-0">
                      {w.prize > 0 ? `₦${w.prize.toLocaleString()}` : "-"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  No winners matching your filter.
                </p>
              )}
            </div>

            {/* Desktop Winners Table */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Completed session winners"
              className="hidden sm:block overflow-x-auto"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-left text-xs font-semibold text-slate-400">
                    <th className="py-3 pr-4">Rank</th>
                    <th className="py-3 pr-4">Prize (₦)</th>
                    <th className="py-3 pr-4">Player</th>
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
                          {w.prize > 0 ? `₦${w.prize.toLocaleString()}` : "-"}
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
        </div>
      )}

      {/* Tab 3: Prize Breakdown */}
      {tab === "prizes" && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                {dynamicTotalWinners} Winners Share ₦{dynamicTotalPool.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Top {dynamicTotalWinners} players win based on highest points and fastest completion time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab("live")}
              className="min-h-10 self-start sm:self-auto rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-accent hover:bg-white/[0.08] transition-colors"
            >
              Back to Leaderboard
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
                  <th className="py-3 pr-3">Rank</th>
                  <th className="py-3 pr-3">Winners</th>
                  <th className="py-3 pr-3">Each (₦)</th>
                  <th className="py-3 text-right">Total (₦)</th>
                </tr>
              </thead>
              <tbody>
                {dynamicPrizeTiers.map((tier) => (
                  <tr
                    key={tier.position}
                    className="border-b border-white/10 text-slate-200"
                  >
                    <th scope="row" className="py-3.5 pr-3 font-display font-bold text-left whitespace-nowrap">
                      {tier.position}
                    </th>
                    <td className="py-3.5 pr-3 text-slate-400 whitespace-nowrap">{tier.winners}</td>
                    <td className="py-3.5 pr-3 font-mono tabular-nums">₦{tier.prize}</td>
                    <td className="py-3.5 text-right font-mono tabular-nums">₦{tier.total}</td>
                  </tr>
                ))}
                <tr className="font-bold text-white">
                  <th scope="row" className="py-3.5 pr-3 text-left">
                    Total
                  </th>
                  <td className="py-3.5 pr-3 text-slate-400">{dynamicTotalWinners} Winners</td>
                  <td className="py-3.5 pr-3" />
                  <td className="py-3.5 text-right font-mono text-accent tabular-nums">
                    ₦{dynamicTotalPool.toLocaleString()}
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
