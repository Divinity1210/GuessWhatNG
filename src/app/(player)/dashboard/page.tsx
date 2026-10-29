"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

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
            setLiveLeaderboard((data.leaderboard ?? []).slice(0, 6));
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
                <p className="font-display text-lg font-bold text-accent">
                  {formatNaira(activeSession?.prize_pool ?? 500_000)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Guesses
                </p>
                <p className="font-display text-lg font-bold text-white">
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
                  <p className="font-display text-lg font-bold text-emerald-400">
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

      {/* ── Live Leaderboard (Product Document Page 19 & 29) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-white">
              Live Leaderboard
            </h2>
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300">
              {totalGuesses.toLocaleString()} Guesses
            </span>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <span>Full Leaderboard</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
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
                  return (
                    <tr
                      key={row.user_id}
                      className={`border-b border-white/5 last:border-0 ${
                        isMe ? "text-accent font-semibold" : "text-slate-200"
                      }`}
                    >
                      <td className="py-3.5 pr-4 font-display font-bold">
                        {formatOrdinal(row.rank)}
                      </td>
                      <td className="py-3.5 pr-4 font-medium text-slate-300">
                        {row.prize > 0 ? row.prize.toLocaleString() : "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        {row.profiles?.username ?? profile?.username ?? "Player"}
                        {isMe ? " (You)" : ""}
                      </td>
                      <td className="py-3.5 pr-4 font-mono font-bold">
                        {row.points}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-400">
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
                    <td className="py-3 pr-4 font-mono">{w.points}</td>
                    <td className="py-3 text-right font-semibold text-accent">
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
