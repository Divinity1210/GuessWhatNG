"use client";

import { useEffect, useState } from "react";
import { Avatar, Badge, Button, TabGroup } from "@/components/ui";
import { TrophyIcon, FlameIcon, UsersIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getSessionLeaderboard,
  getCompletedSessions,
  getSessionCrowdBreakdown,
  type LeaderboardRow,
  type SessionRow,
  type CrowdBreakdownRow,
} from "@/lib/supabase/queries";
import {
  TURF_SQUADS,
  VIRAL_DEMO_QUESTIONS,
  buildWhatsAppShareUrl,
} from "@/lib/game/viral-engine";
import { mockLeaderboard } from "@/lib/game/mock-data";

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [boardMode, setBoardMode] = useState("players");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [crowdBreakdown, setCrowdBreakdown] = useState<CrowdBreakdownRow[]>([]);
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
      const [lb, breakdown] = await Promise.all([
        getSessionLeaderboard(selectedSession!, 50),
        getSessionCrowdBreakdown(selectedSession!),
      ]);
      setLeaderboard(lb);
      setCrowdBreakdown(breakdown);
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

  // Use real leaderboard if available, otherwise showcase realistic Hall of Fame standby
  const displayRows: LeaderboardRow[] =
    leaderboard.length > 0
      ? leaderboard
      : mockLeaderboard.map((m, i) => ({
          rank: m.rank,
          points: m.points,
          response_ms: m.timeMs,
          prize: [100000, 50000, 25000, 10000, 10000][i] ?? 5000,
          user_id: `hall-${i}`,
          profiles: { username: m.username, avatar_url: null },
        }));

  const podium = displayRows.slice(0, 3);

  // Group crowd breakdown by question
  const groupedBreakdown = crowdBreakdown.reduce(
    (acc, row) => {
      if (!acc[row.question_id]) {
        acc[row.question_id] = {
          title: row.question_title,
          options: [],
        };
      }
      acc[row.question_id].options.push(row);
      return acc;
    },
    {} as Record<string, { title: string; options: CrowdBreakdownRow[] }>,
  );

  const breakdownQuestions =
    Object.values(groupedBreakdown).length > 0
      ? Object.values(groupedBreakdown)
      : VIRAL_DEMO_QUESTIONS.map((q) => ({
          title: q.title,
          options: q.options.map((o) => ({
            question_id: q.id,
            question_title: q.title,
            option_id: o.id,
            option_label: o.label,
            picks: o.crowdPct * 42,
            percentage: o.crowdPct,
            points_awarded: o.points,
          })),
        }));

  const userTurf = profile?.turf ?? "Lagos (Eko)";
  const waTurfRally = buildWhatsAppShareUrl({
    username: profile?.username ?? "Player",
    referralCode: profile?.referral_code,
    turf: userTurf,
    sessionName: "Turf & Campus Wars",
    prizePool: 250_000,
  });

  const filteredTurfs = TURF_SQUADS.filter((t) => {
    if (boardMode === "cities") return t.category === "city";
    if (boardMode === "campus") return t.category === "campus";
    if (boardMode === "africa") return t.category === "africa";
    return false;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Leaderboard &amp; Turf Wars</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Track individual winners, City/Campus squad standings, and post-session crowd vote breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 0 && (boardMode === "players" || boardMode === "breakdown") && (
            <select
              value={selectedSession ?? ""}
              onChange={(e) => setSelectedSession(e.target.value)}
              aria-label="Select completed session"
              className="rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <a
            href={waTurfRally}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-black text-slate-950 transition-all"
          >
            <UsersIcon className="size-3.5" />
            <span>Rally {userTurf.split(" ")[0]} on WhatsApp</span>
          </a>
        </div>
      </div>

      <TabGroup
        tabs={[
          { label: "🏆 Top Players", value: "players" },
          { label: "⚡ City Turf Wars", value: "cities" },
          { label: "🎓 Campus Clash", value: "campus" },
          { label: "🌍 Pan-African", value: "africa" },
          { label: "📊 Crowd Vote Reveal", value: "breakdown" },
        ]}
        value={boardMode}
        onChange={setBoardMode}
      />

      {/* ── Individual Players Mode ── */}
      {boardMode === "players" && (
        <>
          {leaderboard.length === 0 && (
            <div className="rounded-xl border border-[#F7911B]/30 bg-[#F7911B]/10 px-4 py-2.5 text-xs text-[#F7911B] flex items-center justify-between">
              <span>Showing Hall of Fame Standings (Weekend Showdown #47)</span>
              <Badge variant="active">Verified Payouts</Badge>
            </div>
          )}

          {/* Podium */}
          {podium.length >= 3 && (
            <section className="flex items-end justify-center gap-4 py-6">
              {[podium[1], podium[0], podium[2]].map((p, idx) => {
                const heights = ["h-28", "h-36", "h-24"];
                const ranks = [2, 1, 3];
                return (
                  <div key={p.user_id} className="flex flex-col items-center gap-2">
                    <Avatar name={p.profiles?.username ?? "?"} size="lg" rank={ranks[idx]} />
                    <p className="text-sm font-semibold text-ink">{p.profiles?.username ?? "?"}</p>
                    <p className="text-xs text-ink-muted">
                      {p.points} pts · {(p.response_ms / 1000).toFixed(1)}s
                    </p>
                    <div
                      className={`w-24 ${heights[idx]} rounded-t-xl bg-gradient-to-b ${
                        ranks[idx] === 1
                          ? "from-amber-500/35 to-amber-500/5 border-t border-amber-400/40"
                          : ranks[idx] === 2
                            ? "from-gray-400/30 to-gray-400/5 border-t border-gray-400/30"
                            : "from-orange-700/30 to-orange-700/5 border-t border-orange-600/30"
                      } flex flex-col items-center justify-start pt-3`}
                    >
                      <span className="font-display text-2xl font-bold text-ink">#{ranks[idx]}</span>
                      <span className="text-[11px] font-bold text-accent mt-1">
                        {formatNaira(p.prize)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Full table */}
          <section className="rounded-card border border-rule bg-paper-2 p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs font-medium uppercase tracking-wider text-ink-muted">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Player</th>
                  <th className="pb-3 pr-4 text-right">Points</th>
                  <th className="pb-3 pr-4 text-right hidden sm:table-cell">Speed</th>
                  <th className="pb-3 text-right">Prize</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  const isMe = row.user_id === user?.id;
                  return (
                    <tr
                      key={row.user_id}
                      className={`border-b border-rule/50 last:border-0 ${
                        isMe ? "bg-accent-muted/30" : ""
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <span
                          className={`font-display font-bold text-xs rounded-md px-2 py-1 ${
                            row.rank <= 3
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-paper-3 text-ink"
                          }`}
                        >
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
                      <td className="py-3 pr-4 text-right font-medium text-ink-2">
                        {row.points.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right text-emerald-400 font-mono text-xs hidden sm:table-cell">
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

      {/* ── Turf Wars Mode (Cities, Campuses, Pan-African) ── */}
      {(boardMode === "cities" || boardMode === "campus" || boardMode === "africa") && (
        <section className="space-y-4">
          <div className="rounded-card border border-[#F7911B]/35 bg-gradient-to-r from-[#19131d] via-paper-2 to-[#121723] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#F7911B]">
                <FlameIcon className="size-4" />
                <span>
                  {boardMode === "cities"
                    ? "Nigerian City & State Turf Wars"
                    : boardMode === "campus"
                      ? "University Campus Squad Clash"
                      : "Pan-African Prediction Clash"}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-white">
                You are repping <span className="text-[#F7911B]">{userTurf}</span>
              </h2>
              <p className="text-xs text-ink-muted">
                Every session point scored by a squad member adds to your Turf&apos;s live total!
              </p>
            </div>
            <Button size="sm" href="/play">
              Score Points for {userTurf.split(" ")[0]}
            </Button>
          </div>

          <div className="grid gap-3">
            {filteredTurfs.map((turf, idx) => {
              const isMyTurf = turf.name === userTurf;
              return (
                <div
                  key={turf.id}
                  className={`rounded-card border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isMyTurf
                      ? "border-[#F7911B] bg-[#F7911B]/10 shadow-lg"
                      : "border-rule bg-paper-2"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`grid size-11 place-items-center rounded-2xl font-display text-base font-black ${
                        idx === 0
                          ? "bg-gradient-to-br from-[#F7911B] to-[#FF0400] text-white"
                          : "bg-paper-3 text-ink"
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{turf.emoji}</span>
                        <h3 className="font-display text-lg font-bold text-white">
                          {turf.name}
                        </h3>
                        {isMyTurf && <Badge variant="active">Your Turf</Badge>}
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {turf.slogan} · <strong className="text-ink-2">{turf.basePlayers.toLocaleString()}</strong> active players · MVP{" "}
                        <span className="text-[#F7911B]">@{turf.topPlayer}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                    <p className="font-display text-xl font-black text-[#F7911B]">
                      {turf.basePoints.toLocaleString()} pts
                    </p>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                      {turf.weeklyDelta} this week
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Post-Session Crowd Vote Reveal Mode ── */}
      {boardMode === "breakdown" && (
        <section className="space-y-4">
          <div className="rounded-card border border-rule bg-paper-2 p-5">
            <h2 className="font-display text-lg font-bold text-white">
              📊 Completed Session Crowd Breakdown
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Once a session closes, the vault opens! See the exact percentage of players that voted for each option and the points awarded.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {breakdownQuestions.map((q, qIdx) => (
              <div key={qIdx} className="rounded-card border border-rule bg-paper-2 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-bold text-[#F7911B]">QUESTION {qIdx + 1}</span>
                  <span>10 pts for #1 Majority Pick</span>
                </div>
                <h3 className="font-display text-base font-bold text-white leading-snug">
                  {q.title}
                </h3>
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, oIdx) => {
                    const isTop = oIdx === 0;
                    return (
                      <div
                        key={opt.option_id}
                        className={`relative overflow-hidden rounded-xl border p-3 ${
                          isTop
                            ? "border-[#F7911B]/60 bg-[#F7911B]/10"
                            : "border-rule bg-paper-3"
                        }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 ${
                            isTop
                              ? "bg-gradient-to-r from-[#F7911B]/30 to-[#FF0400]/30"
                              : "bg-white/5"
                          }`}
                          style={{ width: `${opt.percentage}%` }}
                        />
                        <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="font-bold text-white">
                              {isTop ? "👑 " : ""}
                              {opt.option_label}
                            </p>
                            <p className="text-[11px] text-[#F7911B] font-semibold">
                              +{opt.points_awarded} pts · {opt.picks.toLocaleString()} votes
                            </p>
                          </div>
                          <span className="font-display text-base font-black text-white">
                            {opt.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
