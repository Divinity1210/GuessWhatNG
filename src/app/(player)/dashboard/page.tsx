"use client";

import { useEffect, useState } from "react";
import { Button, StatCard, Badge, Avatar } from "@/components/ui";
import {
  TrophyIcon,
  CoinsIcon,
  TimerIcon,
  PlayIcon,
  TrendingUpIcon,
  GiftIcon,
  ArrowRightIcon,
  FlameIcon,
  UsersIcon,
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
  updateProfile,
  type SessionRow,
  type WalletRow,
  type LeaderboardRow,
} from "@/lib/supabase/queries";
import { LiveFomoTicker } from "@/components/viral/LiveFomoTicker";
import { DailyStreetHeatCard } from "@/components/viral/DailyStreetHeatCard";
import { VasTopupModal } from "@/components/viral/WalletModals";
import { TURF_SQUADS, buildWhatsAppShareUrl } from "@/lib/game/viral-engine";

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
  const { user, profile, refreshProfile } = useAuth();
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
  const [showTopup, setShowTopup] = useState(false);
  const [selectedTurf, setSelectedTurf] = useState<string>("Lagos (Eko)");

  useEffect(() => {
    if (profile?.turf) {
      setSelectedTurf(profile.turf);
    }
  }, [profile?.turf]);

  const loadWalletAndStats = async () => {
    if (!user) return;
    const [w, s] = await Promise.all([
      getUserWallet(user.id),
      getPlayerStats(user.id),
    ]);
    setWallet(w);
    setStats(s);
  };

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [activeSessions, w, playerStats, upcoming] = await Promise.all([
          getActiveSessions(),
          getUserWallet(user!.id),
          getPlayerStats(user!.id),
          getUpcomingSessions(),
        ]);

        const active = activeSessions[0] ?? null;
        setActiveSession(active);
        setWallet(w);
        setStats(playerStats);
        setUpcomingSessions(upcoming);

        if (active) {
          const count = await getPlayerCount(active.id);
          setPlayerCount(count);
        }

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

  const handleTurfChange = async (newTurf: string) => {
    setSelectedTurf(newTurf);
    if (user) {
      await updateProfile(user.id, { turf: newTurf });
      await refreshProfile();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const currentTurfObj =
    TURF_SQUADS.find((t) => t.name === selectedTurf) ?? TURF_SQUADS[0];

  const waSquadInvite = buildWhatsAppShareUrl({
    username: profile?.username ?? "Player",
    referralCode: profile?.referral_code,
    turf: selectedTurf,
    sessionName: activeSession?.name ?? "Weekend Showdown",
    prizePool: activeSession?.prize_pool ?? 250_000,
  });

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
      {/* ── Live Social Proof FOMO Ticker ── */}
      <LiveFomoTicker />

      {/* ── Hero session banner ── */}
      {activeSession ? (
        <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
          <div className="absolute inset-0 gradient-glow opacity-60" />
          <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="active" dot>Live Now</Badge>
                <span className="text-xs text-ink-muted">
                  {Math.max(playerCount, 1420).toLocaleString()} players competing
                </span>
                <span className="rounded-full bg-[#F7911B]/15 border border-[#F7911B]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#F7911B]">
                  🔥 2x Sure Lock Enabled
                </span>
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
            <div className="flex flex-wrap gap-3">
              <Button size="lg" href="/play" className="inline-flex items-center gap-2">
                <PlayIcon className="size-5 fill-current" />
                <span>Play Now</span>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-card border border-[#F7911B]/35 bg-paper-2 p-6 md:p-8">
          <div className="absolute inset-0 gradient-glow opacity-50" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="active" dot>Street Practice Arena Live</Badge>
                <span className="text-xs text-[#F7911B] font-bold">🔥 2x Sure Lock Ready</span>
              </div>
              <h2 className="font-display text-2xl font-bold">
                Naija Crowd Showdown · Practice &amp; Speed Arena
              </h2>
              <p className="text-sm text-ink-2 max-w-xl">
                Warm up your crowd intuition and speed tiebreaker with 5 iconic Nigerian &amp; African questions while the next cash session prepares to launch.
              </p>
            </div>
            <Button size="lg" href="/play" className="inline-flex items-center gap-2 shrink-0">
              <PlayIcon className="size-5 fill-current" />
              <span>Play Street Arena Now</span>
            </Button>
          </div>
        </section>
      )}

      {/* ── Daily Street Heat Free Poll + Flame Streak ── */}
      {user && (
        <DailyStreetHeatCard
          userId={user.id}
          username={profile?.username}
          referralCode={profile?.referral_code}
          turf={selectedTurf}
          onCoinsAwarded={(bonus) => {
            setWallet((prev) =>
              prev ? { ...prev, coin_balance: prev.coin_balance + bonus } : prev,
            );
          }}
        />
      )}

      {/* ── Rep Your Turf / Squad Pride Bar ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#F7911B]/15 border border-[#F7911B]/30 text-2xl shrink-0">
            {currentTurfObj.emoji}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#F7911B]">
                YOUR TURF SQUAD
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {currentTurfObj.weeklyDelta} this week
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-white mt-0.5">
              {currentTurfObj.name} ·{" "}
              <span className="text-[#F7911B]">
                {(currentTurfObj.basePoints + (stats?.totalPoints ?? 0)).toLocaleString()} pts
              </span>
            </h3>
            <p className="text-xs text-ink-muted">
              {currentTurfObj.slogan} · {currentTurfObj.basePlayers.toLocaleString()} squad members
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedTurf}
            onChange={(e) => handleTurfChange(e.target.value)}
            aria-label="Switch your Turf Squad"
            className="rounded-xl border border-rule bg-paper-3 px-3 py-2 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
          >
            {TURF_SQUADS.map((t) => (
              <option key={t.id} value={t.name}>
                {t.emoji} {t.name}
              </option>
            ))}
          </select>

          <a
            href={waSquadInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-black text-slate-950 transition-all"
          >
            <UsersIcon className="size-3.5" />
            <span>Recruit on WhatsApp (+50 Coins)</span>
          </a>
        </div>
      </section>

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
        <Button
          variant="secondary"
          onClick={() => setShowTopup(true)}
          className="inline-flex items-center gap-2"
        >
          <CoinsIcon className="size-4 text-[#F7911B]" />
          <span>Buy Coins (Airtime)</span>
        </Button>
        <Button variant="outline" href="/leaderboard" className="inline-flex items-center gap-2">
          <TrophyIcon className="size-4 text-amber-400" />
          <span>Turf &amp; Player Ranks</span>
        </Button>
        <Button variant="ghost" href="/referrals" className="inline-flex items-center gap-2">
          <FlameIcon className="size-4 text-accent" />
          <span>Invite Squad (+50 Coins)</span>
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
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowTopup(true)}>
              + Top Up
            </Button>
            <Button variant="secondary" size="sm" href="/wallet">
              Wallet
            </Button>
          </div>
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

      {showTopup && user && (
        <VasTopupModal
          userId={user.id}
          onClose={() => setShowTopup(false)}
          onSuccess={loadWalletAndStats}
        />
      )}
    </div>
  );
}
