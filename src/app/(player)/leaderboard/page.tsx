"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getActiveSessions,
  getCompletedSessions,
  getSessionLeaderboard,
  type LeaderboardRow,
  type SessionRow,
} from "@/lib/supabase/queries";

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

  const [completedSessions, setCompletedSessions] = useState<SessionRow[]>([]);
  const [selectedCompletedId, setSelectedCompletedId] = useState<string>("");
  const [completedWinners, setCompletedWinners] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

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
            setLiveRows(data.leaderboard ?? []);
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
      {/* Header & Clean 2-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Points update dynamically as more players guess. Shortest time breaks ties.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-white/10 bg-[#0d111c] p-1">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
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
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === "winners"
                ? "bg-accent text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Winners Board
          </button>
        </div>
      </div>

      {/* ── Tab 1: Live Leaderboard (Product Document Pages 19, 29, 30) ── */}
      {tab === "live" && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
          {/* Top Bar: Guesses Count Up (Left), Search (Middle), Session Countdown (Right) — Page 29 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-white">
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
                    return (
                      <tr
                        key={row.user_id}
                        className={`border-b border-white/10 last:border-0 ${
                          isMe
                            ? "text-accent font-semibold"
                            : row.rank === 1
                              ? "text-sky-400 font-medium"
                              : "text-slate-200"
                        }`}
                      >
                        <th
                          scope="row"
                          className="py-3.5 pr-4 font-display font-bold text-left"
                        >
                          {formatOrdinal(row.rank)}
                        </th>
                        <td className="py-3.5 pr-4 font-mono">
                          {row.prize > 0 ? row.prize.toLocaleString() : "—"}
                        </td>
                        <td className="py-3.5 pr-4">
                          {row.profiles?.username ?? "Player"}
                          {isMe ? " (You)" : ""}
                        </td>
                        <td className="py-3.5 pr-4 font-mono font-bold">
                          {row.points}
                        </td>
                        <td className="py-3.5 text-right font-mono">
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
          {/* 36 Winners / N500,000 Prize Breakdown (Page 20) */}
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
                      <td className="py-3 pr-4 font-mono">{tier.prize}</td>
                      <td className="py-3 text-right font-mono">{tier.total}</td>
                    </tr>
                  ))}
                  <tr className="font-bold text-white">
                    <th scope="row" className="py-3.5 pr-4 text-left">
                      Total
                    </th>
                    <td className="py-3.5 pr-4" />
                    <td className="py-3.5 text-right font-mono text-accent">
                      500,000
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Past Session Winners */}
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
                      <td className="py-3.5 pr-4 font-mono text-accent">
                        {w.prize > 0 ? w.prize.toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        {w.profiles?.username ?? "Player"}
                      </td>
                      <td className="py-3.5 pr-4 font-mono font-bold">
                        {w.points}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-400">
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
