"use client";

import { useState } from "react";
import { TabGroup, Avatar, Badge, Button } from "@/components/ui";
import { TrophyIcon, GiftIcon } from "@/components/ui/Icons";

const filters = [
  { label: "Current Session", value: "session" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "All-Time", value: "all-time" },
];

/* ── Mock data ── */
const myPosition = { rank: 24, points: 12450, percentile: "Top 5%" };

const topPlayers = [
  { rank: 1, name: "AdéOlá92", points: 48500, time: "0:42", prize: "₦150,000" },
  { rank: 2, name: "ChiChi_Win", points: 47200, time: "0:45", prize: "₦75,000" },
  { rank: 3, name: "NaijaGuesser", points: 46800, time: "0:48", prize: "₦50,000" },
];

const restPlayers = [
  { rank: 4, name: "Lagos_King", points: 45200, time: "0:51", prize: "₦25,000" },
  { rank: 5, name: "TemiGuess", points: 44100, time: "0:53", prize: "₦15,000" },
  { rank: 6, name: "BenueBlaze", points: 43800, time: "0:55", prize: "₦10,000" },
  { rank: 7, name: "AbujaAce", points: 42500, time: "0:58", prize: "₦7,500" },
  { rank: 8, name: "PortH_Star", points: 41200, time: "1:01", prize: "₦5,000" },
  { rank: 9, name: "IbadanQueen", points: 40800, time: "1:03", prize: "₦5,000" },
  { rank: 10, name: "KanoKing99", points: 39500, time: "1:06", prize: "₦5,000" },
];

export default function LeaderboardPage() {
  const [search, setSearch] = useState("");
  const allPlayers = [...topPlayers, ...restPlayers];
  const filtered = search
    ? allPlayers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : allPlayers;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-ink-muted">See where you stand among all players</p>
        </div>
        <Button variant="secondary" size="sm" href="/wallet" className="inline-flex items-center gap-1.5">
          <GiftIcon className="size-4 text-accent" />
          <span>Claim Rewards</span>
        </Button>
      </div>

      {/* ── Your Position Card ── */}
      <div className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
        <div className="absolute inset-0 gradient-brand-soft" />
        <div className="relative z-10 flex flex-wrap items-center gap-6 p-6 md:gap-10">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-accent-3 to-accent font-display text-xl font-bold text-white">
              #{myPosition.rank}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Your Rank</p>
              <p className="font-display text-2xl font-bold text-ink">{myPosition.rank}th</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total Points</p>
            <p className="font-display text-2xl font-bold text-ink">{myPosition.points.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Percentile</p>
            <p className="font-display text-2xl font-bold text-success">{myPosition.percentile}</p>
          </div>
        </div>
      </div>

      {/* ── Filters + Search ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <TabGroup tabs={filters} defaultValue="session" />
        <div className="relative">
          <input
            type="search"
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 md:w-64"
          />
        </div>
      </div>

      {/* ── Top 3 podium ── */}
      <div className="grid grid-cols-3 gap-4">
        {[topPlayers[1], topPlayers[0], topPlayers[2]].map((p, i) => {
          const podiumOrder = [2, 1, 3];
          const rank = podiumOrder[i];
          const isGold = rank === 1;
          return (
            <div
              key={p.name}
              className={`flex flex-col items-center gap-3 rounded-card border p-5 text-center transition-all duration-300 ${
                isGold
                  ? "border-accent/40 bg-accent-muted shadow-glow -mt-4"
                  : "border-rule bg-paper-2"
              }`}
            >
              <span className={`inline-flex items-center justify-center size-8 rounded-full font-black text-xs font-display ${
                rank === 1 ? "bg-amber-500 text-black" : rank === 2 ? "bg-slate-400 text-black" : "bg-amber-700 text-white"
              }`}>
                #{rank}
              </span>
              <Avatar name={p.name} size="lg" rank={rank} />
              <div>
                <p className="font-display font-bold text-ink">{p.name}</p>
                <p className="text-xs text-ink-muted">{p.points.toLocaleString()} pts</p>
              </div>
              <Badge variant={isGold ? "warning" : "neutral"}>{p.prize}</Badge>
            </div>
          );
        })}
      </div>

      {/* ── Full table ── */}
      <div className="rounded-card border border-rule bg-paper-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule bg-paper-3/50 text-left text-xs font-medium uppercase tracking-wider text-ink-muted">
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Player</th>
                <th className="px-6 py-3 text-right">Points</th>
                <th className="px-6 py-3 text-right hidden sm:table-cell">Avg. Time</th>
                <th className="px-6 py-3 text-right">Prize</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.rank}
                  className="border-b border-rule/50 last:border-0 transition-colors hover:bg-surface-boost"
                >
                  <td className="px-6 py-3.5">
                    <span className="font-display font-bold text-ink">
                      #{p.rank}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" rank={p.rank} />
                      <span className="font-medium text-ink">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-ink-2">{p.points.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-right text-ink-3 hidden sm:table-cell">{p.time}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-accent">{p.prize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
