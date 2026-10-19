"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Badge, Avatar } from "@/components/ui";
import {
  PlayIcon,
  TimerIcon,
  ArrowRightIcon,
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
import { VasTopupModal, WithdrawalModal } from "@/components/viral/WalletModals";
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
  const [showWithdraw, setShowWithdraw] = useState(false);
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
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Live Market Activity Feed ── */}
      <LiveFomoTicker />

      {/* ── Unified Financial & Performance Ledger Strip ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8 flex-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
                Withdrawable Cash
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#10B981] tabular-nums">
                {formatNaira(wallet?.withdrawable_balance ?? 0)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
                GW Coin Balance
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#F7911B] tabular-nums">
                {(wallet?.coin_balance ?? 0).toLocaleString()} <span className="text-xs text-[#8A92A6]">GW</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
                Career Yield
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#F4F5F8] tabular-nums">
                {(stats?.totalPoints ?? 0).toLocaleString()} <span className="text-xs text-[#8A92A6]">pts</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
                Sessions / Best Rank
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#F4F5F8] tabular-nums">
                {stats?.gamesPlayed ?? 0} <span className="text-xs text-[#8A92A6]">/ {stats?.bestRank ? `#${stats.bestRank}` : "—"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#222631]">
            <Button size="sm" onClick={() => setShowTopup(true)}>
              + Top Up Coins (VAS)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowWithdraw(true)}>
              Withdraw Cash
            </Button>
          </div>
        </div>
      </section>

      {/* ── Primary Live Session Ticket ── */}
      {activeSession ? (
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="active" dot>LIVE MARKET</Badge>
                <span className="font-mono text-xs text-[#8A92A6] tabular-nums">
                  {Math.max(playerCount, 1420).toLocaleString()} ENTRIES
                </span>
                <span className="rounded border border-[#F7911B]/30 bg-[#F7911B]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#F7911B]">
                  2X MULTIPLIER AVAILABLE
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F4F5F8]">
                {activeSession.name}
              </h1>
              <div className="flex flex-wrap items-center gap-5 font-mono text-xs text-[#8A92A6] tabular-nums">
                <span>
                  POOL: <strong className="text-[#10B981]">{formatNaira(activeSession.prize_pool)}</strong>
                </span>
                <span>
                  ENTRY: <strong className="text-[#F4F5F8]">{activeSession.entry_fee_coins} GW</strong>
                </span>
                <span>
                  CLOSES IN: <strong className="text-[#F7911B]">{timeRemaining(activeSession.ends_at)}</strong>
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <Button size="lg" href="/play" className="w-full md:w-auto">
                <PlayIcon className="size-4 fill-current" />
                <span>Enter Live Arena</span>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="active" dot>OPEN PRACTICE MARKET</Badge>
                <span className="font-mono text-[11px] text-[#F7911B]">2X MULTIPLIER ENABLED</span>
              </div>
              <h2 className="font-display text-xl font-bold text-[#F4F5F8]">
                Naija Consensus Practice Arena (5 Questions)
              </h2>
              <p className="text-xs sm:text-sm text-[#8A92A6] max-w-xl">
                Calibrate your crowd read and response speed on 5 cultural prediction markets while the next guaranteed cash pool opens.
              </p>
            </div>
            <Button size="lg" href="/play" className="w-full md:w-auto shrink-0">
              <PlayIcon className="size-4 fill-current" />
              <span>Launch Arena</span>
            </Button>
          </div>
        </section>
      )}

      {/* ── Daily Consensus Poll + Streak ── */}
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

      {/* ── Division Assignment & Syndicate Bar ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="grid size-11 place-items-center rounded-lg border border-[#2E3442] bg-[#171A21] font-mono text-xs font-bold text-[#F7911B] shrink-0">
            {currentTurfObj.emoji}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                ACTIVE DIVISION
              </span>
              <span className="font-mono text-[11px] font-medium text-[#10B981]">
                {currentTurfObj.weeklyDelta} WEEKLY
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#F4F5F8] mt-0.5">
              {currentTurfObj.name} ·{" "}
              <span className="font-mono text-[#F7911B] tabular-nums">
                {(currentTurfObj.basePoints + (stats?.totalPoints ?? 0)).toLocaleString()} pts
              </span>
            </h3>
            <p className="text-xs text-[#8A92A6]">
              {currentTurfObj.slogan} · {currentTurfObj.basePlayers.toLocaleString()} active players
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedTurf}
            onChange={(e) => handleTurfChange(e.target.value)}
            aria-label="Switch Division"
            className="rounded-lg border border-[#222631] bg-[#090A0D] px-3 py-2 text-xs font-medium text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
          >
            {TURF_SQUADS.map((t) => (
              <option key={t.id} value={t.name}>
                [{t.emoji}] {t.name}
              </option>
            ))}
          </select>

          <a
            href={waSquadInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2E3442] bg-[#171A21] hover:bg-[#1F242D] px-3.5 py-2 text-xs font-semibold text-[#F4F5F8] transition-colors"
          >
            <span>Invite to Division (+50 GW)</span>
          </a>
        </div>
      </section>

      {/* ── Two-Column Bottom Grid: Settled Winners & Upcoming Schedule ── */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Recent Settled Winners */}
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#222631] pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
              Recent Pool Settlements
            </h2>
            <Link href="/leaderboard" className="text-xs font-medium text-[#F7911B] hover:underline">
              Full Standings →
            </Link>
          </div>
          {recentWinners.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#222631] text-left font-mono text-[10px] uppercase tracking-wider text-[#8A92A6]">
                    <th className="pb-2.5 pr-3">Rank</th>
                    <th className="pb-2.5 pr-3">Player</th>
                    <th className="pb-2.5 pr-3 text-right">Points</th>
                    <th className="pb-2.5 text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222631]">
                  {recentWinners.map((w) => (
                    <tr key={w.user_id}>
                      <td className="py-2.5 pr-3 font-mono font-semibold text-[#8A92A6] tabular-nums">
                        #{w.rank}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={w.profiles?.username ?? "?"} size="sm" rank={w.rank} />
                          <span className="font-medium text-[#F4F5F8]">@{w.profiles?.username ?? "player"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono text-[#C8CDD8] tabular-nums">
                        {w.points.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-[#10B981] tabular-nums">
                        {formatNaira(w.prize)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-[#8A92A6]">
              No settled sessions recorded yet. Enter the active pool to claim the top rank.
            </p>
          )}
        </section>

        {/* Upcoming Schedule */}
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[#222631] pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
              Upcoming Pools
            </h2>
            <Link href="/sessions" className="inline-flex items-center gap-1 text-xs font-medium text-[#F7911B] hover:underline">
              <span>Schedule</span>
              <ArrowRightIcon className="size-3" />
            </Link>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="mt-3 divide-y divide-[#222631]">
              {upcomingSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#F4F5F8]">{s.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[#8A92A6] flex items-center gap-1">
                      <TimerIcon className="size-3" />
                      <span>
                        {new Date(s.starts_at).toLocaleDateString("en-NG", {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <p className="text-xs font-semibold text-[#10B981]">{formatNaira(s.prize_pool)}</p>
                    <p className="text-[11px] text-[#8A92A6]">{s.entry_fee_coins} GW</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-[#8A92A6]">
              Next 72-hour pool schedule will be published shortly.
            </p>
          )}
        </section>
      </div>

      {showTopup && user && (
        <VasTopupModal
          userId={user.id}
          onClose={() => setShowTopup(false)}
          onSuccess={loadWalletAndStats}
        />
      )}

      {showWithdraw && user && (
        <WithdrawalModal
          userId={user.id}
          maxAmount={wallet?.withdrawable_balance ?? 0}
          onClose={() => setShowWithdraw(false)}
          onSuccess={loadWalletAndStats}
        />
      )}
    </div>
  );
}
