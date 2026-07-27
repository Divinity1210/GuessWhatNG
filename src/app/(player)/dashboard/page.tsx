"use client";

import { Button, StatCard, Badge, ProgressBar, Avatar } from "@/components/ui";
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

/* ── Mock data ── */
const mockSession = {
  name: "Sunday Showdown",
  prizePool: "₦500,000",
  entryFee: 200,
  playersJoined: 1247,
  timeRemaining: "2h 34m",
  status: "active" as const,
};

const stats = [
  { label: "Current Rank", value: "#24", trend: { value: "4 up", positive: true } },
  { label: "Total Points", value: "12,450", trend: { value: "850 this week", positive: true } },
  { label: "Coin Balance", value: "3,250", Icon: CoinsIcon },
  { label: "Win Rate", value: "68%", trend: { value: "5% vs last week", positive: true } },
  { label: "Games Played", value: "47" },
  { label: "Current Streak", value: "5", Icon: FlameIcon },
];

const recentWinners = [
  { rank: 1, name: "AdéOlá92", points: 4850, prize: "₦150,000" },
  { rank: 2, name: "ChiChi_Win", points: 4720, prize: "₦75,000" },
  { rank: 3, name: "NaijaGuesser", points: 4680, prize: "₦50,000" },
  { rank: 4, name: "Lagos_King", points: 4520, prize: "₦25,000" },
  { rank: 5, name: "TemiGuess", points: 4410, prize: "₦15,000" },
];

const dailyChallenge = {
  title: "Answer 5 questions correctly",
  progress: 3,
  total: 5,
  reward: "50 coins",
};

const upcomingSessions = [
  { name: "Midweek Madness", time: "Wed 8pm", fee: 100, pool: "₦250,000" },
  { name: "Weekend Warriors", time: "Sat 6pm", fee: 300, pool: "₦750,000" },
  { name: "Naija Legends", time: "Sun 3pm", fee: 500, pool: "₦1,200,000" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero session banner ── */}
      <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
        {/* Glow background */}
        <div className="absolute inset-0 gradient-glow opacity-60" />
        <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="active" dot>Live Now</Badge>
              <span className="text-xs text-ink-muted">{mockSession.playersJoined.toLocaleString()} players</span>
            </div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">{mockSession.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-3">
              <span className="flex items-center gap-1.5">
                <TrophyIcon className="size-4 text-amber-400" />
                <span>Prize: <span className="font-semibold text-accent">{mockSession.prizePool}</span></span>
              </span>
              <span className="flex items-center gap-1.5">
                <CoinsIcon className="size-4 text-[#F7911B]" />
                <span>Entry: <span className="font-semibold text-ink">{mockSession.entryFee} coins</span></span>
              </span>
              <span className="flex items-center gap-1.5">
                <TimerIcon className="size-4 text-gray-400" />
                <span>Ends in: <span className="font-semibold text-ink">{mockSession.timeRemaining}</span></span>
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button size="lg" href="/play" className="inline-flex items-center gap-2">
              <PlayIcon className="size-5 fill-current" />
              <span>Play Now</span>
            </Button>
            <Button variant="secondary" size="lg">
              View Details
            </Button>
          </div>
        </div>
      </section>

      {/* ── Quick stats grid ── */}
      <section className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            trend={stat.trend}
            icon={stat.Icon ? <stat.Icon className="size-5 text-[#F7911B]" /> : undefined}
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

      {/* ── Two column layout: Daily challenge + Recent winners ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily challenge */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Daily Challenge</h2>
            <span className="text-xs text-accent font-semibold">{dailyChallenge.reward}</span>
          </div>
          <p className="mt-3 text-sm text-ink-3">{dailyChallenge.title}</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>{dailyChallenge.progress}/{dailyChallenge.total} completed</span>
              <span>{Math.round((dailyChallenge.progress / dailyChallenge.total) * 100)}%</span>
            </div>
            <ProgressBar value={(dailyChallenge.progress / dailyChallenge.total) * 100} size="md" />
          </div>
          <Button className="mt-4 w-full inline-flex items-center justify-center gap-1.5" size="sm" href="/play">
            <span>Continue Challenge</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </section>

        {/* Recent winners */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent Winners</h2>
            <Button variant="ghost" size="sm" href="/leaderboard">View All</Button>
          </div>
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
                  <tr key={w.rank} className="border-b border-rule/50 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="font-display font-bold text-xs rounded-md bg-paper-3 px-2 py-1 text-ink">
                        #{w.rank}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.name} size="sm" rank={w.rank} />
                        <span className="font-medium text-ink">{w.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-ink-2">{w.points.toLocaleString()}</td>
                    <td className="py-3 text-right font-semibold text-accent">{w.prize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Recommended / Upcoming sessions ── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Upcoming Sessions</h2>
          <Button variant="ghost" size="sm" href="/sessions">
            <span>View All</span>
            <ArrowRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
        <div className="mt-4 stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingSessions.map((s) => (
            <div key={s.name} className="rounded-card border border-rule bg-paper-2 p-5 transition-all duration-200 hover:border-rule-2 hover:shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-ink">{s.name}</h3>
                  <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
                    <TimerIcon className="size-3.5" />
                    <span>{s.time}</span>
                  </p>
                </div>
                <Badge variant="upcoming">Upcoming</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-ink-3 flex items-center gap-1">
                  <TrophyIcon className="size-4 text-amber-400" />
                  <span className="font-semibold text-accent">{s.pool}</span>
                </span>
                <span className="text-ink-3 flex items-center gap-1">
                  <CoinsIcon className="size-4 text-[#F7911B]" />
                  <span>{s.fee} coins</span>
                </span>
              </div>
              <Button className="mt-4 w-full" variant="secondary" size="sm">
                Set Reminder
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
