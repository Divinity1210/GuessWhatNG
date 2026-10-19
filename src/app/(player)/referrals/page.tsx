"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { UsersIcon, CoinsIcon, CheckIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getReferredUsers, type ReferralRow } from "@/lib/supabase/queries";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
  TURF_SQUADS,
} from "@/lib/game/viral-engine";

const AMBASSADOR_TIERS = [
  { name: "Tier 1 · Associate", minRefs: 0, code: "T1", perk: "+50 GW per verified invite" },
  { name: "Tier 2 · Captain", minRefs: 3, code: "T2", perk: "+150 GW milestone bonus" },
  { name: "Tier 3 · Syndicate Lead", minRefs: 10, code: "T3", perk: "Division badge + priority pools" },
  { name: "Tier 4 · Partner", minRefs: 25, code: "T4", perk: "Monthly partner revenue share" },
];

export default function ReferralsPage() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const refs = await getReferredUsers(user!.id);
        setReferrals(refs);
      } catch (err) {
        console.error("Referrals load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const refCode = profile?.referral_code ?? "NAIJA26";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://guesswhat-tan.vercel.app";
  const inviteLink = `${origin}/sign-up?ref=${encodeURIComponent(refCode)}`;
  const turfInfo =
    TURF_SQUADS.find((t) => t.id === (profile?.turf || "lagos") || t.name === profile?.turf) ??
    TURF_SQUADS[0];
  const turfLabel = `${turfInfo.name} (${turfInfo.emoji})`;

  const currentTierIndex = AMBASSADOR_TIERS.reduce(
    (acc, tier, idx) => (referrals.length >= tier.minRefs ? idx : acc),
    0,
  );
  const currentTier = AMBASSADOR_TIERS[currentTierIndex];
  const nextTier = AMBASSADOR_TIERS[currentTierIndex + 1];

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
    turf: turfInfo.name,
    challengeQuestion: "If Burna Boy, Wizkid & Davido drop at midnight, who hits #1 first?",
    prizePool: 250000,
  });

  const twitterUrl = buildTwitterShareUrl({
    referralCode: refCode,
    turf: turfInfo.name,
    challengeQuestion: "If Burna Boy, Wizkid & Davido drop at midnight, who hits #1 first?",
  });

  const handleDownloadInviteCard = () => {
    setDownloadingCard(true);
    try {
      const dataUrl = generateBragCardDataUrl({
        username: profile?.username || "Player",
        turf: turfInfo.name,
        sessionName: "Weekend Showdown Pool",
        prizePool: "₦250,000",
        timeSeconds: "18.4",
        answeredCount: 10,
        used2xLock: true,
        challengeQuestion: "Predict what the majority of Nigerians will choose & compete for cash.",
        referralCode: refCode,
      });
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `GuessWhat-Slip-${refCode}.png`;
        a.click();
      }
    } finally {
      setDownloadingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
            Syndicate &amp; Referral Ledger
          </h1>
          <p className="text-xs text-[#8A92A6] mt-0.5">
            Every verified signup credits <strong className="text-[#F7911B]">+50 GW Coins</strong> to your balance and{" "}
            <strong className="text-[#10B981]">+150 GW Coins</strong> to your invitee.
          </p>
        </div>
        <Badge variant="gold">
          [{currentTier.code}] {currentTier.name}
        </Badge>
      </div>

      {/* ── Referral Command Panel ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222631] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border border-[#2E3442] bg-[#171A21] text-[#F7911B]">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F4F5F8]">
                Recruit for {turfLabel}
              </h2>
              <p className="text-xs text-[#8A92A6]">
                Direct links automatically apply your referral code on sign-up.
              </p>
            </div>
          </div>
          <span className="rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#10B981]">
            +50 GW / SIGNUP
          </span>
        </div>

        {/* Code & Direct Link */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-[#222631] bg-[#090A0D] px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                Referral Code
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold tracking-wider text-[#F7911B]">
                {refCode}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyCode}>
              {copiedCode ? "Copied" : "Copy Code"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#222631] bg-[#090A0D] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                Auto-Apply Link
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-[#C8CDD8]">{inviteLink}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copiedLink ? "Copied" : "Copy URL"}
            </Button>
          </div>
        </div>

        {/* Share Channels */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-[#F7911B] hover:bg-[#FFA236] px-4 py-2.5 text-xs font-semibold text-[#090A0D] transition-colors"
          >
            Share via WhatsApp
          </a>

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-[#2E3442] bg-[#171A21] hover:bg-[#1F242D] px-4 py-2.5 text-xs font-semibold text-[#F4F5F8] transition-colors"
          >
            Post on X
          </a>

          <button
            type="button"
            onClick={handleDownloadInviteCard}
            disabled={downloadingCard}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#222631] bg-[#090A0D] hover:border-[#2E3442] px-4 py-2.5 text-xs font-medium text-[#C8CDD8] transition-colors disabled:opacity-50"
          >
            {downloadingCard ? "Rendering PNG..." : "Download Slip PNG"}
          </button>
        </div>
      </section>

      {/* ── Telemetry Strip ── */}
      <div className="grid grid-cols-3 divide-x divide-[#222631] rounded-xl border border-[#222631] bg-[#111318] py-4 text-center font-mono tabular-nums">
        <div className="px-3">
          <p className="text-xl font-semibold text-[#F4F5F8]">{referrals.length}</p>
          <p className="mt-1 font-sans text-[11px] text-[#8A92A6]">Verified Invites</p>
        </div>
        <div className="px-3">
          <p className="text-xl font-semibold text-[#F7911B]">{referrals.length * 50} GW</p>
          <p className="mt-1 font-sans text-[11px] text-[#8A92A6]">Coins Earned</p>
        </div>
        <div className="px-3">
          <p className="text-xl font-semibold text-[#10B981]">
            {nextTier ? `${Math.max(0, nextTier.minRefs - referrals.length)}` : "MAX"}
          </p>
          <p className="mt-1 font-sans text-[11px] text-[#8A92A6]">
            {nextTier ? `To ${nextTier.code}` : "Top Tier"}
          </p>
        </div>
      </div>

      {/* ── Syndicate Tiers ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5">
        <div className="flex items-center justify-between border-b border-[#222631] pb-3 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
            Syndicate Progression
          </h2>
          <span className="font-mono text-xs text-[#8A92A6] tabular-nums">
            {referrals.length} / {nextTier ? nextTier.minRefs : 25} INVITES
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AMBASSADOR_TIERS.map((tier, idx) => {
            const unlocked = referrals.length >= tier.minRefs;
            const isCurrent = idx === currentTierIndex;
            return (
              <div
                key={tier.name}
                className={`rounded-lg border p-4 ${
                  isCurrent
                    ? "border-[#F7911B] bg-[#171A21]"
                    : unlocked
                      ? "border-[#2E3442] bg-[#090A0D]"
                      : "border-[#222631] bg-[#090A0D] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded border border-[#2E3442] bg-[#111318] px-2 py-0.5 font-mono text-xs font-bold text-[#F7911B]">
                    {tier.code}
                  </span>
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#10B981]">
                      <CheckIcon className="size-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-[#8A92A6]">
                      {tier.minRefs} REQ
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-[#F4F5F8]">{tier.name}</p>
                <p className="mt-1 text-xs text-[#8A92A6]">{tier.perk}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Referred Players Ledger ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
          Referred Accounts
        </h2>
        {referrals.length > 0 ? (
          <div className="mt-4 divide-y divide-[#222631]">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-lg border border-[#2E3442] bg-[#171A21] font-mono text-xs font-semibold text-[#F4F5F8]">
                    {ref.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-[#F4F5F8]">@{ref.username}</p>
                    <p className="font-mono text-[11px] text-[#8A92A6]">
                      {new Date(ref.created_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                </div>
                <Badge variant="active">+50 GW</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-[#222631] bg-[#090A0D] p-6 text-center">
            <CoinsIcon className="mx-auto size-6 text-[#8A92A6]" />
            <p className="mt-2 text-xs font-semibold text-[#F4F5F8]">No referred accounts yet</p>
            <p className="mt-1 text-xs text-[#8A92A6]">
              Share your invite link with your division to credit +50 GW Coins per verified signup.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
