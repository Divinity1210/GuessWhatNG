"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
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
import { getReferredUsers, type ReferralRow } from "@/lib/supabase/queries";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
  TURF_SQUADS,
} from "@/lib/game/viral-engine";

type MonthlyReferralRow = {
  rank: number;
  userId: string;
  username: string;
  referralCode: string;
  referralsCount: number;
  turf: string;
};

export default function ReferralsPage() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<MonthlyReferralRow[]>([]);
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
        });
        if (res.ok) {
          const data = await res.json();
          if (data.referralCode) setApiRefCode(data.referralCode);
          if (Array.isArray(data.referrals)) {
            setReferrals(data.referrals);
          }
          if (Array.isArray(data.monthlyLeaderboard)) {
            setMonthlyLeaderboard(data.monthlyLeaderboard);
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

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Referrals &amp; Monthly Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Invite friends with your referral code or signup link. Top monthly referrers win rewards.
          </p>
        </div>
        <Badge variant="active">
          {referrals.length} Referred Player{referrals.length === 1 ? "" : "s"}
        </Badge>
      </div>

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
              Friends who sign up with your code or link are automatically credited to your rank.
            </p>
          </div>
        </div>

        {/* Code & Auto-Link Boxes */}
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

        {/* 1-Tap Viral Share Buttons */}
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

      {/* Monthly Referral Leaderboard */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <TrophyIcon className="size-5 shrink-0 text-amber-400" />
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-white">
              Monthly Referral Leaderboard
            </h2>
            <p className="text-xs text-slate-400">
              Top players with the highest verified referrals this month.
            </p>
          </div>
        </div>

        {/* Mobile Card Rows (< sm) */}
        <div className="space-y-2 sm:hidden">
          {monthlyLeaderboard.map((row) => {
            const isMe =
              row.userId === user?.id ||
              row.username.toLowerCase() === (profile?.username ?? "").toLowerCase();
            return (
              <div
                key={row.userId}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                  isMe
                    ? "border-accent/40 bg-accent/10"
                    : "border-white/[0.07] bg-[#080b12]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-display text-sm font-bold tabular-nums text-amber-300 w-7 shrink-0">
                    #{row.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {row.username}
                      {isMe ? " (You)" : ""}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      Code: {row.referralCode}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold tabular-nums text-white">
                    {row.referralsCount}
                  </p>
                  <p className="text-[10px] text-slate-400">referrals</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (>= sm) */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Monthly referral leaderboard"
          className="hidden sm:block overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                <th className="py-3 pr-4">Rank</th>
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 pr-4">Referral Code</th>
                <th className="py-3 text-right">Referrals</th>
              </tr>
            </thead>
            <tbody>
              {monthlyLeaderboard.map((row) => {
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
                    <td className="py-3 pr-4 font-display font-bold tabular-nums">
                      #{row.rank}
                    </td>
                    <td className="py-3 pr-4">
                      {row.username}
                      {isMe ? " (You)" : ""}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-400">
                      {row.referralCode}
                    </td>
                    <td className="py-3 text-right font-mono font-bold tabular-nums">
                      {row.referralsCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Referred Players List */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
        <h2 className="font-display text-base sm:text-lg font-bold text-white">
          Players You Referred ({referrals.length})
        </h2>
        {referrals.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 font-display text-xs font-bold text-accent">
                    {ref.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{ref.username}</p>
                    <p className="text-xs text-slate-400">
                      Joined {new Date(ref.created_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                </div>
                <Badge variant="active">Verified</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm font-semibold text-white">No referrals yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Share your referral link above with friends to climb the Monthly Referral Leaderboard.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
