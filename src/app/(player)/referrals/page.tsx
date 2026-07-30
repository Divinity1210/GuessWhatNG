"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { UsersIcon, CoinsIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getReferredUsers, type ReferralRow } from "@/lib/supabase/queries";

export default function ReferralsPage() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!profile?.referral_code) return;
    const text = `Join me on Guess What! Use my code ${profile.referral_code} to sign up and get bonus coins. https://guesswhat-tan.vercel.app/sign-up`;
    if (navigator.share) {
      navigator.share({ title: "Guess What — Join me!", text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      <h1 className="font-display text-2xl font-bold">Referrals</h1>

      {/* ── Referral card ── */}
      <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2 p-6 md:p-8">
        <div className="absolute inset-0 gradient-glow opacity-40" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <UsersIcon className="size-6 text-accent" />
            <h2 className="font-display text-lg font-bold">Invite Friends, Earn Coins</h2>
          </div>
          <p className="text-sm text-ink-muted">Share your referral code. When a friend signs up and plays, you both earn bonus coins!</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 rounded-[var(--radius-sm)] border border-accent/30 bg-accent-muted px-4 py-3 text-center font-display text-xl font-bold tracking-[0.2em] text-accent">
              {profile?.referral_code ?? "—"}
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <Button className="mt-4 w-full" onClick={handleShare}>
            Share Referral Link
          </Button>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-rule bg-paper-2 p-5 text-center">
          <p className="font-display text-2xl font-bold text-ink">{referrals.length}</p>
          <p className="text-xs text-ink-muted mt-1">Friends Referred</p>
        </div>
        <div className="rounded-card border border-rule bg-paper-2 p-5 text-center">
          <p className="font-display text-2xl font-bold text-accent">{referrals.length * 50}</p>
          <p className="text-xs text-ink-muted mt-1">Bonus Coins Earned</p>
        </div>
      </div>

      {/* ── Referred users list ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Referred Friends</h2>
        {referrals.length > 0 ? (
          <div className="mt-4 space-y-3">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{ref.username}</p>
                  <p className="text-xs text-ink-muted">Joined {new Date(ref.created_at).toLocaleDateString("en-NG")}</p>
                </div>
                <Badge variant="active">+50 coins</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-ink-muted">No referrals yet. Share your code to start earning!</p>
        )}
      </section>
    </div>
  );
}
