"use client";

import { useEffect, useState } from "react";
import { Avatar, Badge, Button, EmptyState } from "@/components/ui";
import { TrophyIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getSessionLeaderboard,
  getCompletedSessions,
  type LeaderboardRow,
  type SessionRow,
} from "@/lib/supabase/queries";

function formatNaira(n: number) { return `₦${n.toLocaleString()}`; }

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const completed = await getCompletedSessions(10);
        setSessions(completed);
        if (completed.length > 0) {
          setSelectedSession(completed[0].id);
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
    if (!selectedSession) return;
    async function loadLb() {
      const lb = await getSessionLeaderboard(selectedSession!, 50);
      setLeaderboard(lb);
    }
    loadLb();
  }, [selectedSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
        {sessions.length > 0 && (
          <select
            value={selectedSession ?? ""}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <EmptyState title="No results yet" description="Leaderboards appear after a session is completed." />
      ) : (
        <>
          {/* ── Podium ── */}
          {podium.length >= 3 && (
            <section className="flex items-end justify-center gap-4 py-6">
              {[podium[1], podium[0], podium[2]].map((p, idx) => {
                const heights = ["h-28", "h-36", "h-24"];
                const ranks = [2, 1, 3];
                return (
                  <div key={p.user_id} className="flex flex-col items-center gap-2">
                    <Avatar name={p.profiles?.username ?? "?"} size="lg" rank={ranks[idx]} />
                    <p className="text-sm font-semibold text-ink">{p.profiles?.username ?? "?"}</p>
                    <p className="text-xs text-ink-muted">{p.points} pts</p>
                    <div className={`w-20 ${heights[idx]} rounded-t-lg bg-gradient-to-b ${
                      ranks[idx] === 1 ? "from-amber-500/30 to-amber-500/5" :
                      ranks[idx] === 2 ? "from-gray-400/30 to-gray-400/5" :
                      "from-orange-700/30 to-orange-700/5"
                    } flex items-start justify-center pt-3`}>
                      <span className="font-display text-2xl font-bold text-ink">#{ranks[idx]}</span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* ── Full table ── */}
          <section className="rounded-card border border-rule bg-paper-2 p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs font-medium uppercase tracking-wider text-ink-muted">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Player</th>
                  <th className="pb-3 pr-4 text-right">Points</th>
                  <th className="pb-3 pr-4 text-right hidden sm:table-cell">Time</th>
                  <th className="pb-3 text-right">Prize</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => {
                  const isMe = row.user_id === user?.id;
                  return (
                    <tr key={row.user_id} className={`border-b border-rule/50 last:border-0 ${isMe ? "bg-accent-muted/30" : ""}`}>
                      <td className="py-3 pr-4">
                        <span className={`font-display font-bold text-xs rounded-md px-2 py-1 ${
                          row.rank <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-paper-3 text-ink"
                        }`}>
                          #{row.rank}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.profiles?.username ?? "?"} size="sm" rank={row.rank} />
                          <span className={`font-medium ${isMe ? "text-accent" : "text-ink"}`}>
                            {row.profiles?.username ?? "Unknown"} {isMe && "(You)"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-ink-2">{row.points.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right text-ink-muted hidden sm:table-cell">
                        {(row.response_ms / 1000).toFixed(1)}s
                      </td>
                      <td className="py-3 text-right font-semibold text-accent">
                        {row.prize > 0 ? formatNaira(row.prize) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
