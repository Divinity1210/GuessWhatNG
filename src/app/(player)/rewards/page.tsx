"use client";

import { StatCard, Badge, Button, ProgressBar } from "@/components/ui";
import {
  CoinsIcon,
  TimerIcon,
  TrophyIcon,
  FlameIcon,
  StarIcon,
  UsersIcon,
  TargetIcon,
  CheckIcon,
} from "@/components/ui/Icons";

const rewardStats = [
  { label: "Total Earned", value: "₦145,000", Icon: CoinsIcon },
  { label: "Pending Rewards", value: "₦4,500", Icon: TimerIcon },
  { label: "Achievements", value: "12/25", Icon: TrophyIcon },
  { label: "Streak Bonus", value: "5x", Icon: FlameIcon },
];

const achievements = [
  { name: "First Win", desc: "Win your first session", Icon: TrophyIcon, unlocked: true },
  { name: "Streak Master", desc: "Win 5 sessions in a row", Icon: FlameIcon, unlocked: true },
  { name: "Top 10", desc: "Finish in the top 10", Icon: StarIcon, unlocked: true },
  { name: "Big Spender", desc: "Enter a ₦500+ session", Icon: CoinsIcon, unlocked: true },
  { name: "Social Butterfly", desc: "Refer 5 friends", Icon: UsersIcon, unlocked: false, progress: 60 },
  { name: "Marathon Player", desc: "Play 100 sessions", Icon: TargetIcon, unlocked: false, progress: 47 },
  { name: "Perfect Score", desc: "Answer all questions correctly", Icon: StarIcon, unlocked: false, progress: 0 },
  { name: "Legend", desc: "Reach #1 on the all-time board", Icon: TrophyIcon, unlocked: false, progress: 0 },
];

const history = [
  { desc: "Sunday Showdown — 2nd place", amount: "₦75,000", date: "Today" },
  { desc: "Daily challenge completion", amount: "50 coins", date: "Today" },
  { desc: "Achievement unlocked — Top 10", amount: "100 coins", date: "Yesterday" },
  { desc: "Friday Frenzy — 8th place", amount: "₦5,000", date: "Jul 19" },
  { desc: "Referral bonus — @Lagos_King", amount: "100 coins", date: "Jul 18" },
];

export default function RewardsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Rewards</h1>
          <p className="mt-1 text-sm text-ink-muted">Track your earnings, achievements, and bonuses</p>
        </div>
        <Button size="sm" href="/wallet">Withdraw Rewards</Button>
      </div>

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rewardStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={<s.Icon className="size-5 text-[#F7911B]" />} />
        ))}
      </div>

      {/* Achievements */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Achievements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.name}
              className={`rounded-[var(--radius-md)] border p-4 transition-all duration-200 ${
                a.unlocked
                  ? "border-accent/30 bg-accent-muted"
                  : "border-rule bg-paper-3 opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="size-10 grid place-items-center rounded-xl bg-[#F7911B]/10 text-[#F7911B]">
                  <a.Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{a.name}</p>
                  <p className="truncate text-xs text-ink-muted">{a.desc}</p>
                </div>
                {a.unlocked && (
                  <Badge variant="success">
                    <CheckIcon className="size-3" />
                  </Badge>
                )}
              </div>
              {!a.unlocked && a.progress !== undefined && a.progress > 0 && (
                <ProgressBar value={a.progress} className="mt-3" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reward history */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule p-5">
          <h2 className="font-display text-lg font-bold">Reward History</h2>
        </div>
        <div className="divide-y divide-rule/50">
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink">{h.desc}</p>
                <p className="text-xs text-ink-muted">{h.date}</p>
              </div>
              <p className="text-sm font-semibold text-success">+{h.amount}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
