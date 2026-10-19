"use client";

import { useEffect, useState } from "react";
import { Avatar, Badge, Button, TabGroup } from "@/components/ui";
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
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
      </div>
    );
  }

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

  const topThree = displayRows.slice(0, 3);

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
    sessionName: "Division Standings",
    prizePool: 250_000,
  });

  const filteredTurfs = TURF_SQUADS.filter((t) => {
    if (boardMode === "cities") return t.category === "city";
    if (boardMode === "campus") return t.category === "campus";
    if (boardMode === "africa") return t.category === "africa";
    return false;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
            Standings &amp; Division Ledger
          </h1>
          <p className="text-xs text-[#8A92A6] mt-0.5">
            Settled player rankings, City &amp; University division aggregates, and post-session crowd distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 0 && (boardMode === "players" || boardMode === "breakdown") && (
            <select
              value={selectedSession ?? ""}
              onChange={(e) => setSelectedSession(e.target.value)}
              aria-label="Select completed session"
              className="rounded-lg border border-[#222631] bg-[#111318] px-3 py-2 text-xs text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2E3442] bg-[#171A21] hover:bg-[#1F242D] px-3.5 py-2 text-xs font-semibold text-[#F4F5F8] transition-colors"
          >
            <span>Share {userTurf.split(" ")[0]} Standings</span>
          </a>
        </div>
      </div>

      <TabGroup
        tabs={[
          { label: "Top Players", value: "players" },
          { label: "City Divisions", value: "cities" },
          { label: "Universities", value: "campus" },
          { label: "Pan-African", value: "africa" },
          { label: "Vote Distribution", value: "breakdown" },
        ]}
        value={boardMode}
        onChange={setBoardMode}
      />

      {/* ── Individual Players Mode ── */}
      {boardMode === "players" && (
        <>
          {leaderboard.length === 0 && (
            <div className="rounded-lg border border-[#222631] bg-[#111318] px-4 py-2.5 text-xs text-[#C8CDD8] flex items-center justify-between">
              <span>Archive: Weekend Showdown #47</span>
              <Badge variant="active">SETTLED</Badge>
            </div>
          )}

          {/* Top 3 Ledger Cards */}
          {topThree.length >= 3 && (
            <section className="grid gap-3 sm:grid-cols-3">
              {topThree.map((p) => (
                <div
                  key={p.user_id}
                  className={`rounded-xl border p-4 ${
                    p.rank === 1
                      ? "border-[#F7911B]/50 bg-[#111318]"
                      : "border-[#222631] bg-[#111318]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#8A92A6]">
                      RANK #0{p.rank}
                    </span>
                    <span className="font-mono text-sm font-semibold text-[#10B981] tabular-nums">
                      {formatNaira(p.prize)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar name={p.profiles?.username ?? "?"} size="md" rank={p.rank} />
                    <div>
                      <p className="text-sm font-semibold text-[#F4F5F8]">
                        @{p.profiles?.username ?? "player"}
                      </p>
                      <p className="font-mono text-xs text-[#8A92A6] tabular-nums">
                        {p.points} pts · {(p.response_ms / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Full Standings Table */}
          <section className="rounded-xl border border-[#222631] bg-[#111318] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#222631] bg-[#0D0F14] text-left font-mono text-[10px] uppercase tracking-wider text-[#8A92A6]">
                    <th className="py-3 pl-5 pr-3">Rank</th>
                    <th className="py-3 pr-3">Player</th>
                    <th className="py-3 pr-3 text-right">Points</th>
                    <th className="py-3 pr-3 text-right hidden sm:table-cell">Speed</th>
                    <th className="py-3 pr-5 text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222631]">
                  {displayRows.map((row) => {
                    const isMe = row.user_id === user?.id;
                    return (
                      <tr
                        key={row.user_id}
                        className={isMe ? "bg-[#F7911B]/10" : "hover:bg-[#171A21]/40"}
                      >
                        <td className="py-3 pl-5 pr-3 font-mono text-xs font-semibold text-[#8A92A6] tabular-nums">
                          #{row.rank}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.profiles?.username ?? "?"} size="sm" rank={row.rank} />
                            <span className={`font-medium ${isMe ? "text-[#F7911B]" : "text-[#F4F5F8]"}`}>
                              @{row.profiles?.username ?? "player"} {isMe && "(You)"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-[#C8CDD8] tabular-nums">
                          {row.points.toLocaleString()}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-xs text-[#8A92A6] hidden sm:table-cell tabular-nums">
                          {(row.response_ms / 1000).toFixed(1)}s
                        </td>
                        <td className="py-3 pr-5 text-right font-mono font-semibold text-[#10B981] tabular-nums">
                          {row.prize > 0 ? formatNaira(row.prize) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ── Division Standings Mode (Cities, Campuses, Pan-African) ── */}
      {(boardMode === "cities" || boardMode === "campus" || boardMode === "africa") && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[#222631] bg-[#111318] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#F7911B]">
                {boardMode === "cities"
                  ? "NIGERIAN CITY & STATE DIVISIONS"
                  : boardMode === "campus"
                    ? "UNIVERSITY CAMPUS DIVISIONS"
                    : "PAN-AFRICAN DIVISIONS"}
              </span>
              <h2 className="text-lg font-semibold text-[#F4F5F8]">
                Assigned Division: <span className="text-[#F7911B]">{userTurf}</span>
              </h2>
              <p className="text-xs text-[#8A92A6]">
                Every session point scored by a division member increments the live aggregate.
              </p>
            </div>
            <Button size="sm" href="/play">
              Add Points for {userTurf.split(" ")[0]}
            </Button>
          </div>

          <div className="rounded-xl border border-[#222631] bg-[#111318] divide-y divide-[#222631] overflow-hidden">
            {filteredTurfs.map((turf, idx) => {
              const isMyTurf = turf.name === userTurf;
              return (
                <div
                  key={turf.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isMyTurf ? "bg-[#171A21]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono text-xs font-semibold text-[#8A92A6] w-6 tabular-nums">
                      0{idx + 1}
                    </span>
                    <span className="grid size-10 place-items-center rounded-lg border border-[#2E3442] bg-[#090A0D] font-mono text-xs font-bold text-[#F7911B] shrink-0">
                      {turf.emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-[#F4F5F8]">
                          {turf.name}
                        </h3>
                        {isMyTurf && <Badge variant="gold">YOUR DIVISION</Badge>}
                      </div>
                      <p className="font-mono text-[11px] text-[#8A92A6] mt-0.5 tabular-nums">
                        {turf.basePlayers.toLocaleString()} players · Lead: @{turf.topPlayer}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 font-mono tabular-nums">
                    <p className="text-base font-semibold text-[#F4F5F8]">
                      {turf.basePoints.toLocaleString()} pts
                    </p>
                    <span className="text-xs text-[#10B981]">
                      {turf.weeklyDelta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Post-Session Vote Distribution Mode ── */}
      {boardMode === "breakdown" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[#222631] bg-[#111318] p-5">
            <h2 className="text-base font-semibold text-[#F4F5F8]">
              Post-Session Consensus Distribution
            </h2>
            <p className="text-xs text-[#8A92A6] mt-1">
              Exact percentage of entries recorded per option after pool close.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {breakdownQuestions.map((q, qIdx) => (
              <div key={qIdx} className="rounded-xl border border-[#222631] bg-[#111318] p-5 space-y-3">
                <div className="flex items-center justify-between font-mono text-[11px] text-[#8A92A6]">
                  <span className="text-[#F7911B] font-semibold">MARKET 0{qIdx + 1}</span>
                  <span>RANK #1 = 10 PTS</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#F4F5F8] leading-snug">
                  {q.title}
                </h3>
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, oIdx) => {
                    const isTop = oIdx === 0;
                    return (
                      <div
                        key={opt.option_id}
                        className={`relative overflow-hidden rounded-lg border p-3 ${
                          isTop
                            ? "border-[#F7911B]/50 bg-[#171A21]"
                            : "border-[#222631] bg-[#090A0D]"
                        }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 ${
                            isTop ? "bg-[#F7911B]/15" : "bg-white/[0.03]"
                          }`}
                          style={{ width: `${opt.percentage}%` }}
                        />
                        <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="font-medium text-[#F4F5F8]">
                              {opt.option_label}
                            </p>
                            <p className="font-mono text-[10px] text-[#8A92A6] mt-0.5 tabular-nums">
                              +{opt.points_awarded} PTS · {opt.picks.toLocaleString()} ENTRIES
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-[#F4F5F8] tabular-nums">
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
