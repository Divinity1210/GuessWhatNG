import Link from "next/link";
import { mockSession, mockStats, mockLeaderboard } from "@/lib/game/mock-data";

export const metadata = { title: "Dashboard" };

function hoursLeft(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600_000));
}

export default function DashboardPage() {
  const stats = [
    { label: "Current Rank", value: `#${mockStats.currentRank}` },
    { label: "Total Points", value: mockStats.totalPoints.toLocaleString() },
    { label: "Coin Balance", value: mockStats.coinBalance.toLocaleString() },
    { label: "Win Rate", value: `${Math.round(mockStats.winRate * 100)}%` },
    { label: "Games Played", value: mockStats.gamesPlayed },
    { label: "Streak", value: `${mockStats.currentStreak} 🔥` },
  ];

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>

      {/* Hero banner: current session */}
      <section className="gradient-brand mt-6 rounded-card p-[1px]">
        <div className="rounded-card bg-card p-6 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-orange">
              Live session
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">
              {mockSession.name}
            </h2>
            <p className="mt-2 text-white/60">
              Prize pool{" "}
              <span className="font-semibold text-white">
                ₦{mockSession.prizePool.toLocaleString()}
              </span>{" "}
              · Entry {mockSession.entryFeeCoins} coins ·{" "}
              {mockSession.playersJoined.toLocaleString()} players ·{" "}
              {hoursLeft(mockSession.endsAt)}h left
            </p>
          </div>
          <Link
            href="/play"
            className="gradient-brand mt-4 inline-block rounded-btn px-6 py-3 font-display font-bold sm:mt-0"
          >
            Join session
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-card border border-border bg-card p-4"
          >
            <p className="text-xs text-white/50">{s.label}</p>
            <p className="mt-1 font-display text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </section>

      {/* Recent winners */}
      <section className="mt-8 rounded-card border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Recent winners</h3>
          <Link href="/leaderboard" className="text-sm text-brand-orange">
            Full leaderboard →
          </Link>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-white/40">
            <tr>
              <th className="pb-2 font-normal">Rank</th>
              <th className="pb-2 font-normal">Player</th>
              <th className="pb-2 font-normal">Points</th>
              <th className="pb-2 font-normal">Prize</th>
            </tr>
          </thead>
          <tbody>
            {mockLeaderboard.map((row) => (
              <tr key={row.rank} className="border-t border-divider">
                <td className="py-2 font-display font-bold">#{row.rank}</td>
                <td className="py-2">{row.username}</td>
                <td className="py-2">{row.points}</td>
                <td className="py-2 text-success">{row.prize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
