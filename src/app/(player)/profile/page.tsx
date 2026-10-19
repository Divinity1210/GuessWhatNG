"use client";

import { useEffect, useState } from "react";
import { Avatar, Badge, Button } from "@/components/ui";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getPlayerStats, getMyEntries, type SessionEntryRow } from "@/lib/supabase/queries";

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
  const [recentEntries, setRecentEntries] = useState<SessionEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [playerStats, entries] = await Promise.all([
          getPlayerStats(user!.id),
          getMyEntries(user!.id, 5),
        ]);
        setStats(playerStats);
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
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
      </div>
    );
  }

  const username = profile?.username ?? "Player";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Profile Header ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={username} size="xl" rank={stats?.bestRank ?? undefined} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F4F5F8]">
                  @{username}
                </h1>
                <Badge variant="gold">{profile?.turf ?? "Lagos (Eko)"}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-[#8A92A6]">{user?.email}</p>
              <p className="mt-1 font-mono text-[11px] text-[#5E6678]">
                Joined{" "}
                {new Date(user?.created_at ?? Date.now()).toLocaleDateString("en-NG", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" href="/settings">
            Account Settings
          </Button>
        </div>

        {/* Unified Career Telemetry Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#222631] rounded-lg border border-[#222631] bg-[#090A0D]">
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Career Yield</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F4F5F8] tabular-nums">
              {(stats?.totalPoints ?? 0).toLocaleString()} pts
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Pools Entered</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F4F5F8] tabular-nums">
              {stats?.gamesPlayed ?? 0}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Highest Rank</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F7911B] tabular-nums">
              {stats?.bestRank ? `#${stats.bestRank}` : "—"}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Settled Prizes</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#10B981] tabular-nums">
              {formatNaira(stats?.totalPrizes ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {/* ── Referral Code Strip ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
            Referral Code
          </h2>
          <p className="mt-0.5 text-xs text-[#8A92A6]">
            Earn +50 GW Coins for every verified account registered with your code.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg border border-[#222631] bg-[#090A0D] px-4 py-2 font-mono text-sm font-semibold tracking-wider text-[#F7911B]">
            {profile?.referral_code ?? "—"}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (profile?.referral_code) {
                navigator.clipboard.writeText(profile.referral_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </section>

      {/* ── Recent Entries Log ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5">
        <div className="flex items-center justify-between border-b border-[#222631] pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
            Recent Session Entries
          </h2>
          <Button variant="ghost" size="sm" href="/sessions">
            <span>All Sessions</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
        {recentEntries.length > 0 ? (
          <div className="divide-y divide-[#222631]">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-3.5 first:pt-4 last:pb-0"
              >
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#F4F5F8]">
                    {entry.game_sessions?.name ?? "Session Pool"}
                  </p>
                  <p className="font-mono text-[11px] text-[#8A92A6] tabular-nums">
                    {new Date(entry.joined_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  {entry.final_rank ? (
                    <p className="text-sm font-semibold text-[#F4F5F8]">#{entry.final_rank}</p>
                  ) : (
                    <Badge variant="upcoming">OPEN</Badge>
                  )}
                  {entry.total_score !== null && (
                    <p className="text-xs text-[#8A92A6] mt-0.5">{entry.total_score} pts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-[#8A92A6]">
            No session entries recorded yet.
          </p>
        )}
      </section>
    </div>
  );
}
