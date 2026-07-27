"use client";

import { Avatar, Badge, StatCard, Button } from "@/components/ui";
import { TrophyIcon, FlameIcon, StarIcon, CoinsIcon, CheckIcon, ArrowRightIcon } from "@/components/ui/Icons";

const gameStats = [
  { label: "Games Played", value: "47" },
  { label: "Win Rate", value: "68%" },
  { label: "Best Rank", value: "#3" },
  { label: "Total Earned", value: "₦145K" },
];

const achievements = [
  { name: "First Win", Icon: TrophyIcon },
  { name: "Streak Master", Icon: FlameIcon },
  { name: "Top 10", Icon: StarIcon },
  { name: "Big Spender", Icon: CoinsIcon },
];

export default function ProfilePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
        <div className="absolute inset-0 gradient-glow opacity-50" />
        <div className="relative z-10 flex flex-col items-center gap-4 p-8 text-center md:flex-row md:text-left">
          <Avatar name="Guest Player" size="lg" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">Guest Player</h1>
            <p className="mt-0.5 text-sm text-ink-muted">@GuestPlayer · Joined July 2026</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <Badge variant="active">Active Player</Badge>
              <Badge variant="neutral">Free Tier</Badge>
            </div>
          </div>
          <Button variant="secondary" size="sm" href="/settings">Edit Profile</Button>
        </div>
      </section>

      {/* Personal info */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule px-5 py-4">
          <h2 className="font-display font-semibold">Personal Information</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {[
            { label: "Full Name", value: "Guest Player" },
            { label: "Email", value: "guest@example.com" },
            { label: "Phone", value: "+234 *** *** 1234" },
            { label: "Location", value: "Lagos, Nigeria" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{f.label}</p>
              <p className="mt-1 text-sm text-ink">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Game stats */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {gameStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Achievements */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold">Achievements</h2>
          <Button variant="ghost" size="sm" href="/rewards" className="inline-flex items-center gap-1">
            <span>View All</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {achievements.map((a) => (
            <div key={a.name} className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-accent/30 bg-accent-muted px-3.5 py-1.5">
              <a.Icon className="size-4 text-[#F7911B]" />
              <span className="text-sm font-medium text-ink">{a.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Payment info */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule px-5 py-4">
          <h2 className="font-display font-semibold">Payment Information</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule bg-paper-3 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-success/15 text-success">
                <CoinsIcon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">GTBank ****4521</p>
                <p className="text-xs text-ink-muted">Primary withdrawal method</p>
              </div>
            </div>
            <Badge variant="success">
              <CheckIcon className="size-3 mr-1 inline" />
              <span>Verified</span>
            </Badge>
          </div>
          <Button variant="secondary" size="sm" className="mt-3">+ Add Payment Method</Button>
        </div>
      </section>
    </div>
  );
}
