"use client";

import { useState } from "react";
import { TabGroup, Badge, Button, EmptyState } from "@/components/ui";
import { CalendarIcon, CoinsIcon, TrophyIcon, TimerIcon } from "@/components/ui/Icons";

const tabs = [
  { label: "Active", value: "active" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
];

const sessions = [
  { id: "1", name: "Sunday Showdown", status: "active", pool: "₦500,000", fee: 200, players: 1247, questions: 20, timeLeft: "2h 34m", score: 4200, rank: 24 },
  { id: "2", name: "Quick Fire Round", status: "active", pool: "₦100,000", fee: 50, players: 890, questions: 10, timeLeft: "45m", score: 1800, rank: 12 },
  { id: "3", name: "Midweek Madness", status: "upcoming", pool: "₦250,000", fee: 100, players: 0, questions: 15, timeLeft: "2d 4h", score: null, rank: null },
  { id: "4", name: "Weekend Warriors", status: "upcoming", pool: "₦750,000", fee: 300, players: 0, questions: 25, timeLeft: "4d 18h", score: null, rank: null },
  { id: "5", name: "Naija Legends", status: "upcoming", pool: "₦1,200,000", fee: 500, players: 0, questions: 30, timeLeft: "6d", score: null, rank: null },
  { id: "6", name: "Friday Frenzy", status: "completed", pool: "₦300,000", fee: 150, players: 2100, questions: 20, timeLeft: null, score: 3850, rank: 8 },
  { id: "7", name: "Morning Blitz", status: "completed", pool: "₦50,000", fee: 25, players: 560, questions: 10, timeLeft: null, score: 1200, rank: 45 },
];

const statusConfig: Record<string, { badge: "active" | "upcoming" | "completed"; label: string }> = {
  active: { badge: "active", label: "Live" },
  upcoming: { badge: "upcoming", label: "Upcoming" },
  completed: { badge: "completed", label: "Completed" },
};

export default function SessionsPage() {
  const [tab, setTab] = useState("active");
  const filtered = sessions.filter((s) => s.status === tab);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Sessions</h1>
        <p className="mt-1 text-sm text-ink-muted">Browse and manage your game sessions</p>
      </div>

      <TabGroup tabs={tabs} defaultValue="active" onChange={setTab} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="size-8 text-gray-500" />}
          title={`No ${tab} sessions`}
          description="Check back soon or browse other tabs."
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-card border border-rule bg-paper-2 p-5 transition-all duration-200 hover:border-rule-2 hover:shadow-soft">
              <div className="flex items-start justify-between">
                <h3 className="font-display font-semibold text-ink">{s.name}</h3>
                <Badge variant={statusConfig[s.status].badge} dot>
                  {statusConfig[s.status].label}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <TrophyIcon className="size-3.5 text-amber-400" />
                    <span>Prize Pool</span>
                  </p>
                  <p className="font-semibold text-accent">{s.pool}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <CoinsIcon className="size-3.5 text-[#F7911B]" />
                    <span>Entry Fee</span>
                  </p>
                  <p className="font-medium text-ink">{s.fee} coins</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Questions</p>
                  <p className="font-medium text-ink">{s.questions}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <TimerIcon className="size-3.5" />
                    <span>{s.status === "completed" ? "Players" : s.status === "upcoming" ? "Starts In" : "Time Left"}</span>
                  </p>
                  <p className="font-medium text-ink">
                    {s.status === "completed" ? s.players.toLocaleString() : s.timeLeft}
                  </p>
                </div>
              </div>

              {s.score !== null && (
                <div className="mt-3 flex items-center gap-4 border-t border-rule/50 pt-3 text-sm">
                  <span className="text-ink-3">Score: <span className="font-semibold text-ink">{s.score.toLocaleString()}</span></span>
                  <span className="text-ink-3">Rank: <span className="font-semibold text-ink">#{s.rank}</span></span>
                </div>
              )}

              <div className="mt-4">
                {s.status === "active" && (
                  <Button className="w-full" size="sm" href="/play">Resume Playing</Button>
                )}
                {s.status === "upcoming" && (
                  <Button className="w-full" variant="secondary" size="sm">Set Reminder</Button>
                )}
                {s.status === "completed" && (
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="secondary" size="sm">View Results</Button>
                    <Button className="flex-1" variant="ghost" size="sm">View Answers</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
