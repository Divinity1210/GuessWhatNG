"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { UsersIcon, CoinsIcon, ZapIcon, CheckIcon, FlameIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getReferredUsers, type ReferralRow } from "@/lib/supabase/queries";
import {
  buildWhatsAppShareUrl,
  buildTwitterShareUrl,
  generateBragCardDataUrl,
  TURF_SQUADS,
} from "@/lib/game/viral-engine";

const AMBASSADOR_TIERS = [
  { name: "Street Starter", minRefs: 0, badge: "🌱", perk: "+50 Coins per invite" },
  { name: "Area Captain", minRefs: 3, badge: "⚡", perk: "+150 Bonus Milestone" },
  { name: "Campus Odogwu", minRefs: 10, badge: "👑", perk: "VIP Turf Badge + Priority Drops" },
  { name: "National Legend", minRefs: 25, badge: "🦁", perk: "Monthly Ambassador Cash Pool" },
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
    TURF_SQUADS.find((t) => t.id === (profile?.turf || "lagos")) ?? TURF_SQUADS[0];
  const turfLabel = `${turfInfo.emoji} ${turfInfo.name}`;

  const currentTierIndex = AMBASSADOR_TIERS.reduce(
    (acc, tier, idx) => (referrals.length >= tier.minRefs ? idx : acc),
    0
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
    turf: turfLabel,
    challengeQuestion: "If Burna Boy, Wizkid & Davido drop at midnight, who hits #1 first?",
    prizePool: 50000,
  });

  const twitterUrl = buildTwitterShareUrl({
    referralCode: refCode,
    turf: turfLabel,
    challengeQuestion: "If Burna Boy, Wizkid & Davido drop at midnight, who hits #1 first?",
  });

  const handleDownloadInviteCard = () => {
    setDownloadingCard(true);
    try {
      const dataUrl = generateBragCardDataUrl({
        username: profile?.username || "Player",
        turf: turfLabel,
        sessionName: "Think & Win Live Cash Arena",
        prizePool: "₦50,000+",
        timeSeconds: "1.4",
        answeredCount: 10,
        used2xLock: true,
        challengeQuestion: "Predict what most Nigerians will pick & win real cash!",
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Squad & Ambassador Hub</h1>
          <p className="text-sm text-ink-muted">
            Recruit players to your turf. Every signup gives{" "}
            <strong className="text-accent">+50 Coins</strong> to you AND{" "}
            <strong className="text-success">+150 Welcome Coins</strong> to your friend!
          </p>
        </div>
        <Badge variant="gold">
          {currentTier.badge} {currentTier.name}
        </Badge>
      </div>

      {/* ── Viral Referral Command Card ── */}
      <section className="relative overflow-hidden rounded-card border border-accent/30 bg-paper-2 p-6 md:p-8 shadow-elevated">
        <div className="absolute inset-0 gradient-glow opacity-45" />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent-muted text-accent">
                <UsersIcon className="size-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">
                  Recruit for {turfLabel}
                </h2>
                <p className="text-xs text-ink-muted">
                  Share on WhatsApp Status, Group Chats, or X — your code auto-applies!
                </p>
              </div>
            </div>
            <span className="rounded-pill border border-success/30 bg-success-muted px-3 py-1 text-xs font-bold text-success">
              Instant +50 Coins / Invite
            </span>
          </div>

          {/* Code & Auto-Link Boxes */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-accent/30 bg-paper-1/90 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                  Your VIP Code
                </p>
                <p className="font-display text-xl font-bold tracking-[0.18em] text-accent">
                  {refCode}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopyCode}>
                {copiedCode ? "Copied!" : "Copy Code"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-rule bg-paper-1/90 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                  1-Click Auto-Apply Link
                </p>
                <p className="truncate font-mono text-xs text-ink-muted">{inviteLink}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>

          {/* 1-Tap Viral Share Buttons */}
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[#25D366] px-4 py-3 text-sm font-bold text-[#07130a] shadow-sm transition-transform hover:scale-[1.01]"
            >
              <span>📲</span> Share to WhatsApp
            </a>

            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-3 text-sm font-bold text-ink transition-colors hover:border-accent/40"
            >
              <span>𝕏</span> Post on X
            </a>

            <button
              type="button"
              onClick={handleDownloadInviteCard}
              disabled={downloadingCard}
              className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-accent-muted px-4 py-3 text-sm font-bold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
            >
              <ZapIcon className="size-4" />
              {downloadingCard ? "Generating PNG..." : "Download Status Flyer"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats & Ambassador Ladder ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-rule bg-paper-2 p-5 text-center">
          <p className="font-display text-2xl font-bold text-ink">{referrals.length}</p>
          <p className="text-xs text-ink-muted mt-1">Squad Recruits</p>
        </div>
        <div className="rounded-card border border-rule bg-paper-2 p-5 text-center">
          <p className="font-display text-2xl font-bold text-accent">{referrals.length * 50}</p>
          <p className="text-xs text-ink-muted mt-1">Referral Coins Earned</p>
        </div>
        <div className="rounded-card border border-rule bg-paper-2 p-5 text-center">
          <p className="font-display text-2xl font-bold text-success">
            {nextTier ? `${Math.max(0, nextTier.minRefs - referrals.length)} left` : "MAX"}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {nextTier ? `To ${nextTier.name}` : "Top Ambassador Tier"}
          </p>
        </div>
      </div>

      {/* ── Campus & Street Ambassador Milestones ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FlameIcon className="size-5 text-accent" />
            <h2 className="font-display text-lg font-bold">Ambassador Ranks</h2>
          </div>
          <span className="text-xs text-ink-muted">
            {referrals.length} / {nextTier ? nextTier.minRefs : 25} recruits
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AMBASSADOR_TIERS.map((tier, idx) => {
            const unlocked = referrals.length >= tier.minRefs;
            const isCurrent = idx === currentTierIndex;
            return (
              <div
                key={tier.name}
                className={`rounded-[var(--radius-sm)] border p-4 transition-all ${
                  isCurrent
                    ? "border-accent bg-accent-muted/40 shadow-glow"
                    : unlocked
                      ? "border-success/30 bg-success-muted/10"
                      : "border-rule bg-paper-3/60 opacity-65"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{tier.badge}</span>
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                      <CheckIcon className="size-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-ink-dim">
                      {tier.minRefs} invites
                    </span>
                  )}
                </div>
                <p className="mt-2 font-display text-sm font-bold text-ink">{tier.name}</p>
                <p className="mt-1 text-xs text-ink-muted">{tier.perk}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Referred users list ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Your Recruited Squad</h2>
        {referrals.length > 0 ? (
          <div className="mt-4 space-y-3">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent-muted font-display text-xs font-bold text-accent">
                    {ref.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{ref.username}</p>
                    <p className="text-xs text-ink-muted">
                      Joined {new Date(ref.created_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                </div>
                <Badge variant="active">+50 coins</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-rule p-6 text-center">
            <CoinsIcon className="mx-auto size-8 text-accent/70" />
            <p className="mt-2 text-sm font-semibold text-ink">No squad recruits yet</p>
            <p className="mt-1 text-xs text-ink-muted">
              Drop your WhatsApp link in your campus or street group chat to earn your first +50
              Coins!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
