"use client";

import { useEffect, useState } from "react";
import { TabGroup, Badge, Button, EmptyState } from "@/components/ui";
import { CalendarIcon, CoinsIcon, TrophyIcon, TimerIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getActiveSessions,
  getUpcomingSessions,
  getCompletedSessions,
  getMyEntries,
  type SessionRow,
  type SessionEntryRow,
} from "@/lib/supabase/queries";

function formatNaira(n: number) { return `₦${n.toLocaleString()}`; }

function timeRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
}

export default function SessionsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("active");
  const [active, setActive] = useState<SessionRow[]>([]);
  const [upcoming, setUpcoming] = useState<SessionRow[]>([]);
  const [completed, setCompleted] = useState<SessionRow[]>([]);
  const [myEntries, setMyEntries] = useState<SessionEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [a, u, c, entries] = await Promise.all([
          getActiveSessions(),
          getUpcomingSessions(),
          getCompletedSessions(20),
          getMyEntries(user!.id, 50),
        ]);
        setActive(a);
        setUpcoming(u);
        setCompleted(c);
        setMyEntries(entries);
      } catch (err) {
        console.error("Sessions load error:", err);
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

  const sessions = tab === "active" ? active : tab === "upcoming" ? upcoming : tab === "completed" ? completed : [];
  const mySessionIds = new Set(myEntries.map((e) => e.session_id));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold">Sessions</h1>

      <TabGroup
        tabs={[
          { label: `Active (${active.length})`, value: "active" },
          { label: `Upcoming (${upcoming.length})`, value: "upcoming" },
          { label: `Completed (${completed.length})`, value: "completed" },
          { label: `My Games (${myEntries.length})`, value: "mine" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "mine" ? (
        myEntries.length > 0 ? (
          <div className="space-y-3">
            {myEntries.map((entry) => (
              <div key={entry.id} className="rounded-card border border-rule bg-paper-2 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-ink">{entry.game_sessions?.name ?? "Session"}</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Joined {new Date(entry.joined_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <div className="text-right">
                    {entry.final_rank ? (
                      <>
                        <p className="font-display text-lg font-bold text-ink">#{entry.final_rank}</p>
                        <p className="text-xs text-ink-muted">{entry.total_score} pts</p>
                      </>
                    ) : (
                      <Badge variant="active">In Progress</Badge>
                    )}
                  </div>
                </div>
                {entry.prize_awarded > 0 && (
                  <p className="mt-2 text-sm font-semibold text-accent">Won {formatNaira(entry.prize_awarded)}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No games yet" description="Join a session to start playing!" />
        )
      ) : sessions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-card border border-rule bg-paper-2 p-5 transition-all duration-200 hover:border-rule-2 hover:shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-ink">{s.name}</h3>
                  <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
                    <TimerIcon className="size-3.5" />
                    {tab === "active" ? timeRemaining(s.ends_at) : new Date(s.starts_at).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant={tab === "active" ? "active" : tab === "upcoming" ? "upcoming" : "default"}>
                  {s.status}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-ink-3 flex items-center gap-1">
                  <TrophyIcon className="size-4 text-amber-400" />
                  <span className="font-semibold text-accent">{formatNaira(s.prize_pool)}</span>
                </span>
                <span className="text-ink-3 flex items-center gap-1">
                  <CoinsIcon className="size-4 text-[#F7911B]" />
                  {s.entry_fee_coins} coins
                </span>
              </div>
              {tab === "active" && !mySessionIds.has(s.id) && (
                <Button className="mt-4 w-full" size="sm" href="/play">
                  Join & Play
                </Button>
              )}
              {tab === "active" && mySessionIds.has(s.id) && (
                <Button className="mt-4 w-full" variant="secondary" size="sm" href="/play">
                  Continue Playing
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${tab} sessions`} description="Check back soon for new sessions." />
      )}
    </div>
  );
}
