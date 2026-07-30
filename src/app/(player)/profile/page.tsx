"use client";

import { useEffect, useState } from "react";
import { Avatar, Badge, StatCard, Button } from "@/components/ui";
import { TrophyIcon, FlameIcon, CoinsIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getPlayerStats, getUserWallet, getMyEntries, type SessionEntryRow } from "@/lib/supabase/queries";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<{
    gamesPlayed: number;
    totalPoints: number;
    bestRank: number | null;
    winRate: number;
    wins: number;
    totalPrizes: number;
  } | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [recentEntries, setRecentEntries] = useState<SessionEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [playerStats, wallet, entries] = await Promise.all([
          getPlayerStats(user!.id),
          getUserWallet(user!.id),
          getMyEntries(user!.id, 5),
        ]);
        setStats(playerStats);
        setCoinBalance(wallet.coin_balance);
        setRecentEntries(entries);
      } catch (err) {
        console.error("Profile load error:", err);
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

  const username = profile?.username ?? "Player";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Profile header ── */}
      <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2 p-6 md:p-8">
        <div className="absolute inset-0 gradient-glow opacity-40" />
        <div className="relative z-10 flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6">
          <Avatar name={username} size="xl" rank={stats?.bestRank ?? undefined} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display text-2xl font-bold">{username}</h1>
            <p className="mt-1 text-sm text-ink-muted">{user?.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <Badge variant={profile?.role === "player" ? "info" : "active"}>
                {profile?.role ?? "player"}
              </Badge>
              {stats && stats.gamesPlayed > 0 && (
                <Badge variant="default">
                  {stats.gamesPlayed} games played
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Member since {new Date(user?.created_at ?? Date.now()).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
            </p>
          </div>
          <Button variant="secondary" size="sm" href="/settings">Edit Profile</Button>
        </div>
      </section>

      {/* ── Stats grid ── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Games Played" value={stats?.gamesPlayed.toString() ?? "0"} />
        <StatCard label="Total Points" value={stats?.totalPoints.toLocaleString() ?? "0"} />
        <StatCard label="Best Rank" value={stats?.bestRank ? `#${stats.bestRank}` : "—"} icon={<TrophyIcon className="size-5 text-amber-400" />} />
        <StatCard label="Win Rate" value={`${Math.round((stats?.winRate ?? 0) * 100)}%`} />
        <StatCard label="Wins" value={stats?.wins.toString() ?? "0"} icon={<FlameIcon className="size-5 text-orange-400" />} />
        <StatCard label="Prizes Won" value={formatNaira(stats?.totalPrizes ?? 0)} icon={<CoinsIcon className="size-5 text-[#F7911B]" />} />
      </section>

      {/* ── Referral code ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Referral Code</h2>
        <p className="mt-1 text-sm text-ink-muted">Share your code and earn bonus coins when friends join.</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-[var(--radius-sm)] border border-accent/30 bg-accent-muted px-4 py-3 text-center font-display text-lg font-bold tracking-widest text-accent">
            {profile?.referral_code ?? "—"}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (profile?.referral_code) {
                navigator.clipboard.writeText(profile.referral_code);
              }
            }}
          >
            Copy
          </Button>
        </div>
      </section>

      {/* ── Recent game history ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent Games</h2>
          <Button variant="ghost" size="sm" href="/sessions">
            View All <ArrowRightIcon className="ml-1 size-3.5" />
          </Button>
        </div>
        {recentEntries.length > 0 ? (
          <div className="mt-4 space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{entry.game_sessions?.name ?? "Session"}</p>
                  <p className="text-xs text-ink-muted">{new Date(entry.joined_at).toLocaleDateString("en-NG")}</p>
                </div>
                <div className="text-right">
                  {entry.final_rank ? (
                    <p className="font-display text-sm font-bold text-ink">#{entry.final_rank}</p>
                  ) : (
                    <Badge variant="upcoming" className="text-xs">In progress</Badge>
                  )}
                  {entry.total_score !== null && (
                    <p className="text-xs text-ink-muted">{entry.total_score} pts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-ink-muted">No games played yet. Jump into a session to get started!</p>
        )}
      </section>
    </div>
  );
}
