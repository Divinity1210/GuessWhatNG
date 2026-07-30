"use client";

import { useEffect, useState } from "react";
import { Button, StatCard, Badge, ProgressBar, Avatar } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import {
  TrophyIcon,
  CoinsIcon,
  TimerIcon,
  PlayIcon,
  TrendingUpIcon,
  GiftIcon,
  ArrowRightIcon,
  FlameIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getActiveSessions,
  getUpcomingSessions,
  getUserWallet,
  getPlayerStats,
  getSessionLeaderboard,
  getLatestCompletedSessionId,
  getPlayerCount,
  type SessionRow,
  type WalletRow,
  type LeaderboardRow,
} from "@/lib/supabase/queries";

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [stats, setStats] = useState<{
    gamesPlayed: number;
    totalPoints: number;
    bestRank: number | null;
    winRate: number;
    wins: number;
    totalPrizes: number;
  } | null>(null);
  const [recentWinners, setRecentWinners] = useState<LeaderboardRow[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [activeSessions, wallet, playerStats, upcoming] = await Promise.all([
          getActiveSessions(),
          getUserWallet(user!.id),
          getPlayerStats(user!.id),
          getUpcomingSessions(),
        ]);

        const active = activeSessions[0] ?? null;
        setActiveSession(active);
        setWallet(wallet);
        setStats(playerStats);
        setUpcomingSessions(upcoming);

        if (active) {
          const count = await getPlayerCount(active.id);
          setPlayerCount(count);
        }

        // Fetch leaderboard from latest completed session
        const latestSessionId = await getLatestCompletedSessionId();
        if (latestSessionId) {
          const lb = await getSessionLeaderboard(latestSessionId, 5);
          setRecentWinners(lb);
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
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Points",
      value: stats?.totalPoints.toLocaleString() ?? "0",
      icon: <TrendingUpIcon className="size-5 text-accent" />,
    },
    {
      label: "Coin Balance",
      value: wallet?.coin_balance.toLocaleString() ?? "0",
      icon: <CoinsIcon className="size-5 text-[#F7911B]" />,
    },
    {
      label: "Games Played",
      value: stats?.gamesPlayed.toString() ?? "0",
    },
    {
      label: "Win Rate",
      value: `${Math.round((stats?.winRate ?? 0) * 100)}%`,
    },
    {
      label: "Best Rank",
      value: stats?.bestRank ? `#${stats.bestRank}` : "—",
      icon: <TrophyIcon className="size-5 text-amber-400" />,
    },
    {
      label: "Total Prizes",
      value: formatNaira(stats?.totalPrizes ?? 0),
      icon: <GiftIcon className="size-5 text-green-400" />,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero session banner ── */}
      {activeSession ? (
        <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
          <div className="absolute inset-0 gradient-glow opacity-60" />
          <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="active" dot>Live Now</Badge>
                <span className="text-xs text-ink-muted">{playerCount.toLocaleString()} players</span>
              </div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">{activeSession.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-ink-3">
                <span className="flex items-center gap-1.5">
                  <TrophyIcon className="size-4 text-amber-400" />
                  <span>Prize: <span className="font-semibold text-accent">{formatNaira(activeSession.prize_pool)}</span></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CoinsIcon className="size-4 text-[#F7911B]" />
                  <span>Entry: <span className="font-semibold text-ink">{activeSession.entry_fee_coins} coins</span></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <TimerIcon className="size-4 text-gray-400" />
                  <span>Ends in: <span className="font-semibold text-ink">{timeRemaining(activeSession.ends_at)}</span></span>
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="lg" href="/play" className="inline-flex items-center gap-2">
                <PlayIcon className="size-5 fill-current" />
                <span>Play Now</span>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-card border border-rule bg-paper-2 p-8 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-accent-muted">
            <PlayIcon className="size-6 text-accent" />
          </div>
          <h2 className="font-display text-xl font-bold">No Active Session</h2>
          <p className="mt-2 text-sm text-ink-muted">Check back soon or browse upcoming sessions below.</p>
        </section>
      )}

      {/* ── Quick stats grid ── */}
      <section className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </section>

      {/* ── Quick actions ── */}
      <section className="flex flex-wrap gap-3">
        <Button href="/play" className="inline-flex items-center gap-2">
          <PlayIcon className="size-4 fill-current" />
          <span>Play Now</span>
        </Button>
        <Button variant="secondary" href="/wallet" className="inline-flex items-center gap-2">
          <CoinsIcon className="size-4 text-[#F7911B]" />
          <span>Buy Coins</span>
        </Button>
        <Button variant="outline" href="/leaderboard" className="inline-flex items-center gap-2">
          <TrophyIcon className="size-4 text-amber-400" />
          <span>Leaderboard</span>
        </Button>
        <Button variant="ghost" href="/rewards" className="inline-flex items-center gap-2">
          <GiftIcon className="size-4 text-accent" />
          <span>Claim Rewards</span>
        </Button>
      </section>

      {/* ── Two column layout: Recent winners ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Wallet summary */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-bold">Wallet</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-3">Coins</span>
              <span className="font-display font-bold text-ink">{wallet?.coin_balance.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-3">Rewards</span>
              <span className="font-display font-bold text-accent">{formatNaira(wallet?.reward_balance ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-3">Withdrawable</span>
              <span className="font-display font-bold text-green-400">{formatNaira(wallet?.withdrawable_balance ?? 0)}</span>
            </div>
          </div>
          <Button className="mt-4 w-full" variant="secondary" size="sm" href="/wallet">
            View Wallet
          </Button>
        </section>

        {/* Recent winners */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent Winners</h2>
            <Button variant="ghost" size="sm" href="/leaderboard">View All</Button>
          </div>
          {recentWinners.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rule text-left text-xs font-medium uppercase tracking-wider text-ink-muted">
                    <th className="pb-3 pr-4">Rank</th>
                    <th className="pb-3 pr-4">Player</th>
                    <th className="pb-3 pr-4 text-right">Points</th>
                    <th className="pb-3 text-right">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWinners.map((w) => (
                    <tr key={w.user_id} className="border-b border-rule/50 last:border-0">
                      <td className="py-3 pr-4">
                        <span className="font-display font-bold text-xs rounded-md bg-paper-3 px-2 py-1 text-ink">
                          #{w.rank}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={w.profiles?.username ?? "?"} size="sm" rank={w.rank} />
                          <span className="font-medium text-ink">{w.profiles?.username ?? "Unknown"}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-ink-2">{w.points.toLocaleString()}</td>
                      <td className="py-3 text-right font-semibold text-accent">{formatNaira(w.prize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-ink-muted">No completed sessions yet. Play to be the first winner!</p>
          )}
        </section>
      </div>

      {/* ── Upcoming sessions ── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Upcoming Sessions</h2>
          <Button variant="ghost" size="sm" href="/sessions">
            <span>View All</span>
            <ArrowRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
        {upcomingSessions.length > 0 ? (
          <div className="mt-4 stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.map((s) => (
              <div key={s.id} className="rounded-card border border-rule bg-paper-2 p-5 transition-all duration-200 hover:border-rule-2 hover:shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-ink">{s.name}</h3>
                    <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
                      <TimerIcon className="size-3.5" />
                      <span>{new Date(s.starts_at).toLocaleDateString("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                    </p>
                  </div>
                  <Badge variant="upcoming">Upcoming</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-ink-3 flex items-center gap-1">
                    <TrophyIcon className="size-4 text-amber-400" />
                    <span className="font-semibold text-accent">{formatNaira(s.prize_pool)}</span>
                  </span>
                  <span className="text-ink-3 flex items-center gap-1">
                    <CoinsIcon className="size-4 text-[#F7911B]" />
                    <span>{s.entry_fee_coins} coins</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-ink-muted">No upcoming sessions scheduled yet.</p>
        )}
      </section>
    </div>
  );
}
