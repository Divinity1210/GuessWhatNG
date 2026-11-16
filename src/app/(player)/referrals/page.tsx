"use client";

import { useEffect, useState } from "react";
import { Avatar, Button, Badge } from "@/components/ui";
import {
  UsersIcon,
  TrophyIcon,
  ZapIcon,
  ShareIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAuthHeaders } from "@/lib/supabase/client";
import { getReferredUsers } from "@/lib/supabase/queries";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
  TURF_SQUADS,
} from "@/lib/game/viral-engine";

type PrizeTier = {
  rank_from: number;
  rank_to: number;
  amount: number;
};

type ReferralConfig = {
  title: string;
  enabled: boolean;
  cycleNumber: number;
  cycleStartedAt: string | null;
  endsNote: string;
  prizeTiers: PrizeTier[];
  totalPool: number;
  totalWinnerSpots: number;
};

type ReferralLeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  referralCode: string;
  verifiedReferrals: number;
  referralsCount?: number;
  cycleSignups?: number;
  prizeAmount: number;
  turf?: string;
  state?: string;
};

type PersonalReferralItem = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  created_at: string;
  sessionsPlayed?: number;
  isVerified?: boolean;
  inCurrentCycle?: boolean;
};

type PreviousCycle = {
  id: string;
  cycleNumber: number;
  title: string;
  endedAt: string;
  totalPool: number;
  winners: {
    rank: number;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    state: string;
    verifiedReferrals: number;
    prizeAmount: number;
  }[];
};

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatTierRange(t: PrizeTier): string {
  return t.rank_from === t.rank_to
    ? formatOrdinal(t.rank_from)
    : `${formatOrdinal(t.rank_from)} to ${formatOrdinal(t.rank_to)}`;
}

export default function ReferralsPage() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<PersonalReferralItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardRow[]>([]);
  const [previousCycles, setPreviousCycles] = useState<PreviousCycle[]>([]);
  const [boardView, setBoardView] = useState<"live" | "past">("live");
  const [config, setConfig] = useState<ReferralConfig>({
    title: "Referral Cash Challenge #1",
    enabled: true,
    cycleNumber: 1,
    cycleStartedAt: null,
    endsNote: "Top verified referrers win cash prizes",
    prizeTiers: [
      { rank_from: 1, rank_to: 1, amount: 50000 },
      { rank_from: 2, rank_to: 2, amount: 30000 },
      { rank_from: 3, rank_to: 3, amount: 20000 },
      { rank_from: 4, rank_to: 10, amount: 5000 },
    ],
    totalPool: 135000,
    totalWinnerSpots: 10,
  });
  const [myStats, setMyStats] = useState<{
    rank: number | null;
    verifiedReferrals: number;
    pendingReferrals: number;
    lifetimeReferrals: number;
    projectedPrize: number;
  }>({
    rank: null,
    verifiedReferrals: 0,
    pendingReferrals: 0,
    lifetimeReferrals: 0,
    projectedPrize: 0,
  });
  const [apiRefCode, setApiRefCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const uid = user?.id ?? "";
        const res = await fetch(`/api/referrals?userId=${encodeURIComponent(uid)}`, {
          cache: "no-store",
          headers: await getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.referralCode) setApiRefCode(data.referralCode);
          if (data.config) setConfig(data.config);
          if (data.myStats) setMyStats(data.myStats);
          if (Array.isArray(data.referrals)) {
            setReferrals(data.referrals);
          }
          const rows = Array.isArray(data.leaderboard)
            ? data.leaderboard
            : Array.isArray(data.monthlyLeaderboard)
            ? data.monthlyLeaderboard
            : [];
          setLeaderboard(rows);
          if (Array.isArray(data.previousCycles)) {
            setPreviousCycles(data.previousCycles);
          }
          return;
        }
        if (user) {
          const refs = await getReferredUsers(user.id);
          setReferrals(refs);
        }
      } catch (err) {
        console.error("Referrals load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const refCode = apiRefCode || profile?.referral_code || "NAIJA26";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://guesswhat-tan.vercel.app";
  const inviteLink = `${origin}/sign-up?ref=${encodeURIComponent(refCode)}`;
  const turfInfo =
    TURF_SQUADS.find((t) => t.id === (profile?.turf || "lagos")) ?? TURF_SQUADS[0];
  const turfLabel = turfInfo.name;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const whatsappUrl = buildWhatsAppShareUrl({
    username: profile?.username || "Player",
    referralCode: refCode,
    turf: turfLabel,
    challengeQuestion: "Predict what most players will pick across 10 questions and share ₦500,000!",
    prizePool: 500000,
  });

  const twitterUrl = buildTwitterShareUrl({
    referralCode: refCode,
    turf: turfLabel,
    challengeQuestion: "Predict what most players will pick across 10 questions and share ₦500,000!",
  });

  const handleDownloadInviteCard = () => {
    setDownloadingCard(true);
    try {
      const dataUrl = generateBragCardDataUrl({
        username: profile?.username || "Player",
        turf: turfLabel,
        sessionName: "GuessWhat Live Session",
        prizePool: "₦500,000",
        timeSeconds: "1.4",
        answeredCount: 10,
        used2xLock: false,
        challengeQuestion: "Predict what most players will pick and win cash prizes!",
        referralCode: refCode,
      });
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `guesswhat-invite-${refCode}.png`;
        a.click();
      }
    } finally {
      setDownloadingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const latestArchive = previousCycles[0] ?? null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Referrals &amp; Cash Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Invite friends who sign up and play at least 1 round to earn verified points toward cash prizes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="active">
            {myStats.verifiedReferrals} Verified
          </Badge>
          {myStats.projectedPrize > 0 && (
            <Badge variant="gold">
              Winning ₦{myStats.projectedPrize.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Referral Cash Prize Pool & Personal Standing Banner */}
      {config.enabled && (
        <section className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#141926] via-[#0d111c] to-[#121622] p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span>Cycle #{config.cycleNumber} Active</span>
                </span>
                <span className="text-xs font-bold text-amber-300">{config.title}</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                ₦{config.totalPool.toLocaleString()} Referral Cash Pool
              </h2>
              <p className="text-xs text-slate-400">
                {config.endsNote}. Paid positions: Top {config.totalWinnerSpots} verified referrers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              <div className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Your Rank
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-white mt-0.5 tabular-nums">
                  {myStats.rank ? formatOrdinal(myStats.rank) : "Unranked"}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Projected Prize
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">
                  {myStats.projectedPrize > 0
                    ? `₦${myStats.projectedPrize.toLocaleString()}`
                    : "Top " + config.totalWinnerSpots + " Win"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.08]">
            {config.prizeTiers.map((tier, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs"
              >
                <span className="font-semibold text-slate-300">{formatTierRange(tier)}:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₦{tier.amount.toLocaleString()}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Referral Command Card */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <UsersIcon className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-white">
              Share Your Referral Code
            </h2>
            <p className="text-xs text-slate-400">
              Each friend who joins with your link and completes 1 session adds +1 Verified Referral.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 min-w-0">
          <div className="flex min-w-0 overflow-hidden items-center justify-between gap-3 rounded-xl border border-accent/30 bg-[#07090e] px-3.5 py-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Your Referral Code
              </p>
              <p className="font-display text-lg sm:text-xl font-bold tracking-[0.16em] text-accent truncate">
                {refCode}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyCode} className="shrink-0">
              {copiedCode ? (
                <>
                  <CheckIcon className="size-3.5 mr-1.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5 mr-1.5" />
                  Copy Code
                </>
              )}
            </Button>
          </div>

          <div className="flex min-w-0 overflow-hidden items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#07090e] px-3.5 py-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Referral Signup Link
              </p>
              <p className="truncate font-mono text-xs text-slate-300">{inviteLink}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink} className="shrink-0">
              {copiedLink ? (
                <>
                  <CheckIcon className="size-3.5 mr-1.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5 mr-1.5" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-[#07130a] shadow-sm transition-transform hover:scale-[1.01]"
          >
            <ShareIcon className="size-4 shrink-0" />
            <span>Share on WhatsApp</span>
          </a>

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white transition-colors hover:border-accent/40"
          >
            <ExternalLinkIcon className="size-4 shrink-0" />
            <span>Post on X</span>
          </a>

          <button
            type="button"
            onClick={handleDownloadInviteCard}
            disabled={downloadingCard}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/15 px-4 py-3 text-sm font-bold text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
          >
            <ZapIcon className="size-4 shrink-0" />
            <span>{downloadingCard ? "Generating PNG..." : "Download Invite Flyer"}</span>
          </button>
        </div>
      </section>

      {/* Referral Cash Leaderboard */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <TrophyIcon className="size-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                {boardView === "past" && latestArchive
                  ? `${latestArchive.title} Winners`
                  : "Referral Cash Leaderboard"}
              </h2>
              <p className="text-xs text-slate-400">
                {boardView === "past" && latestArchive
                  ? `Closed ${new Date(latestArchive.endedAt).toLocaleDateString("en-NG")}`
                  : "Ranked by verified playing referrals with projected cash prizes in front."}
              </p>
            </div>
          </div>

          {latestArchive && (
            <div className="inline-flex rounded-xl border border-white/10 bg-[#07090e] p-1 gap-1">
              <button
                type="button"
                onClick={() => setBoardView("live")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  boardView === "live"
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Live Cycle
              </button>
              <button
                type="button"
                onClick={() => setBoardView("past")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  boardView === "past"
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Last Cycle
              </button>
            </div>
          )}
        </div>

        {boardView === "past" && latestArchive ? (
          latestArchive.winners.length > 0 ? (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="past-ref-lb-caption"
              className="overflow-x-auto"
            >
              <table className="w-full text-sm">
                <caption id="past-ref-lb-caption" className="sr-only">
                  Previous referral cycle winners
                </caption>
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                    <th className="py-3 pr-4">Rank</th>
                    <th className="py-3 pr-4">Prize (₦)</th>
                    <th className="py-3 pr-4">Player</th>
                    <th className="py-3 text-right">Verified Refs</th>
                  </tr>
                </thead>
                <tbody>
                  {latestArchive.winners.map((row) => (
                    <tr
                      key={row.userId}
                      className="border-b border-white/5 last:border-0 text-slate-200"
                    >
                      <th scope="row" className="py-3 pr-4 font-display font-bold text-left whitespace-nowrap">
                        {formatOrdinal(row.rank)}
                      </th>
                      <td className="py-3 pr-4 font-mono font-bold text-emerald-400 tabular-nums">
                        {row.prizeAmount > 0 ? `₦${row.prizeAmount.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            name={row.username}
                            src={row.avatarUrl}
                            size="sm"
                            rank={row.rank}
                            showRankBadge={false}
                          />
                          <span className="truncate font-semibold text-white">
                            {row.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold tabular-nums">
                        {row.verifiedReferrals}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              No verified winners were recorded in the previous cycle.
            </p>
          )
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-1">
            <p className="text-sm font-semibold text-white">
              Be the first on Cycle #{config.cycleNumber}
            </p>
            <p className="text-xs text-slate-400">
              Invite a friend with your link and have them play 1 round to claim 1st Place
              {config.enabled && config.prizeTiers[0]?.amount
                ? ` (₦${config.prizeTiers[0].amount.toLocaleString()})`
                : ""}
              .
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card Rows (< sm) */}
            <div className="space-y-2 sm:hidden">
              {leaderboard.map((row) => {
                const isMe =
                  row.userId === user?.id ||
                  row.username.toLowerCase() === (profile?.username ?? "").toLowerCase();
                return (
                  <div
                    key={row.userId}
                    className={`flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-3 ${
                      isMe
                        ? "border-accent/40 bg-accent/10"
                        : "border-white/[0.07] bg-[#080b12]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`font-display text-xs font-bold tabular-nums w-8 shrink-0 ${
                          row.rank === 1
                            ? "text-amber-300"
                            : row.rank === 2
                            ? "text-slate-200"
                            : row.rank === 3
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {formatOrdinal(row.rank)}
                      </span>
                      <Avatar
                        name={row.username}
                        src={row.avatarUrl}
                        size="sm"
                        rank={row.rank}
                        showRankBadge={false}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-white">
                            {row.username}
                          </p>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-accent/20 border border-accent/40 px-1.5 py-0.5 text-[10px] font-bold text-accent leading-none">
                              You
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {row.verifiedReferrals} verified ref{row.verifiedReferrals === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs font-bold tabular-nums text-emerald-400">
                        {row.prizeAmount > 0 ? `₦${row.prizeAmount.toLocaleString()}` : "-"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= sm) */}
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="player-ref-lb-caption"
              className="hidden sm:block overflow-x-auto"
            >
              <table className="w-full text-sm">
                <caption id="player-ref-lb-caption" className="sr-only">
                  Referral cash prize leaderboard
                </caption>
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                    <th className="py-3 pr-4">Rank</th>
                    <th className="py-3 pr-4">Projected Prize (₦)</th>
                    <th className="py-3 pr-4">Player</th>
                    <th className="py-3 text-right">Verified Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => {
                    const isMe =
                      row.userId === user?.id ||
                      row.username.toLowerCase() === (profile?.username ?? "").toLowerCase();
                    return (
                      <tr
                        key={row.userId}
                        className={`border-b border-white/5 last:border-0 ${
                          isMe ? "text-accent font-semibold" : "text-slate-200"
                        }`}
                      >
                        <th
                          scope="row"
                          className="py-3.5 pr-4 font-display font-bold text-left whitespace-nowrap tabular-nums"
                        >
                          {formatOrdinal(row.rank)}
                        </th>
                        <td className="py-3.5 pr-4 font-mono font-bold text-emerald-400 tabular-nums">
                          {row.prizeAmount > 0 ? `₦${row.prizeAmount.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              name={row.username}
                              src={row.avatarUrl}
                              size="sm"
                              rank={row.rank}
                              showRankBadge={false}
                            />
                            <span className="truncate font-semibold text-white">
                              {row.username}
                            </span>
                            {isMe && (
                              <span className="shrink-0 rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold tabular-nums text-white">
                          {row.verifiedReferrals}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Referred Players List */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base sm:text-lg font-bold text-white">
            Players You Referred ({referrals.length})
          </h2>
          {myStats.pendingReferrals > 0 && (
            <span className="text-xs text-amber-300">
              {myStats.pendingReferrals} friend{myStats.pendingReferrals === 1 ? "" : "s"} need 1 game round to verify
            </span>
          )}
        </div>
        {referrals.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={ref.username}
                    src={ref.avatarUrl}
                    size="sm"
                    showRankBadge={false}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{ref.username}</p>
                    <p className="text-xs text-slate-400">
                      Joined {new Date(ref.created_at).toLocaleDateString("en-NG")}
                      {typeof ref.sessionsPlayed === "number"
                        ? ` · ${ref.sessionsPlayed} round${ref.sessionsPlayed === 1 ? "" : "s"} played`
                        : ""}
                    </p>
                  </div>
                </div>
                {ref.inCurrentCycle === false ? (
                  <Badge variant="neutral">Past Cycle</Badge>
                ) : ref.isVerified ? (
                  <Badge variant="active">Verified (+1)</Badge>
                ) : (
                  <Badge variant="warning">Needs 1 Game</Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm font-semibold text-white">No referrals yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Share your referral link above with friends to climb the Referral Cash Leaderboard.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
