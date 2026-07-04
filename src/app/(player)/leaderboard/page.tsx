import { mockLeaderboard, mockSession } from "@/lib/game/mock-data";

export const metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
      <p className="mt-1 text-white/50">
        {mockSession.name} · final rankings are published when the session
        closes
      </p>

      <div className="mt-6 flex gap-2 text-sm">
        {["Current Session", "Weekly", "Monthly", "All-Time"].map((f, i) => (
          <button
            key={f}
            className={`rounded-full px-4 py-1.5 ${
              i === 0
                ? "gradient-brand font-semibold"
                : "border border-border bg-card text-white/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-sidebar text-left text-white/40">
            <tr>
              <th className="px-5 py-3 font-normal">Rank</th>
              <th className="px-5 py-3 font-normal">Username</th>
              <th className="px-5 py-3 font-normal">Points</th>
              <th className="px-5 py-3 font-normal">Time</th>
              <th className="px-5 py-3 font-normal">Prize</th>
            </tr>
          </thead>
          <tbody>
            {mockLeaderboard.map((row) => (
              <tr key={row.rank} className="border-t border-divider">
                <td className="px-5 py-3 font-display font-bold">
                  {row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : `#${row.rank}`}
                </td>
                <td className="px-5 py-3">{row.username}</td>
                <td className="px-5 py-3">{row.points}</td>
                <td className="px-5 py-3 text-white/60">
                  {(row.timeMs / 1000).toFixed(1)}s
                </td>
                <td className="px-5 py-3 text-success">{row.prize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
