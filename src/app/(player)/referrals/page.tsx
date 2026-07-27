"use client";

import { Button, Badge, StatCard } from "@/components/ui";
import { useState } from "react";
import {
  UsersIcon,
  PlayIcon,
  CoinsIcon,
  TrophyIcon,
  CheckIcon,
  ArrowRightIcon,
  TargetIcon,
  GiftIcon,
} from "@/components/ui/Icons";

const referralCode = "GUESSWHAT-GP247";

const stats = [
  { label: "Total Referrals", value: "12", Icon: UsersIcon },
  { label: "Active Players", value: "8", Icon: PlayIcon },
  { label: "Coins Earned", value: "1,200", Icon: CoinsIcon },
  { label: "Cash Earned", value: "₦6,000", Icon: TrophyIcon },
];

const shareChannels = [
  { name: "WhatsApp", color: "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/25" },
  { name: "Facebook", color: "bg-[#1877F2]/15 text-[#1877F2] border-[#1877F2]/25" },
  { name: "X", color: "bg-ink-3/15 text-ink border-rule" },
  { name: "Telegram", color: "bg-[#0088cc]/15 text-[#0088cc] border-[#0088cc]/25" },
  { name: "Email", color: "bg-accent/15 text-accent border-accent/25" },
];

const history = [
  { name: "ChiChi_Win", date: "Jul 21", status: "active", reward: "100 coins" },
  { name: "Lagos_King", date: "Jul 18", status: "active", reward: "100 coins" },
  { name: "TemiGuess", date: "Jul 15", status: "active", reward: "100 coins + ₦500" },
  { name: "BenueBlaze", date: "Jul 12", status: "pending", reward: "Pending signup" },
  { name: "AbujaAce", date: "Jul 10", status: "active", reward: "100 coins" },
];

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Referrals</h1>
        <p className="mt-1 text-sm text-ink-muted">Invite friends and earn rewards together</p>
      </div>

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={<s.Icon className="size-5 text-[#F7911B]" />} />
        ))}
      </div>

      {/* Referral code */}
      <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2 p-6">
        <div className="absolute inset-0 gradient-brand-soft" />
        <div className="relative z-10">
          <h2 className="font-display text-lg font-bold">Your Referral Code</h2>
          <p className="mt-1 text-sm text-ink-3">Share this code and earn 100 coins + ₦500 for every active referral</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-3 font-mono text-lg font-bold text-accent">
              {referralCode}
            </div>
            <Button size="md" onClick={copyCode}>
              {copied ? (
                <span className="flex items-center gap-1.5"><CheckIcon className="size-4" /> Copied!</span>
              ) : (
                "Copy Code"
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Share channels */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Invite Via</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {shareChannels.map((ch) => (
            <button
              key={ch.name}
              className={`flex items-center gap-2 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-medium transition-all duration-200 hover:brightness-110 ${ch.color}`}
            >
              <span>{ch.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">How Referrals Work</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="text-center p-4 rounded-xl bg-paper-3">
            <div className="size-12 mx-auto grid place-items-center rounded-xl bg-[#F7911B]/10 text-[#F7911B]">
              <ArrowRightIcon className="size-6" />
            </div>
            <h3 className="mt-3 font-display font-semibold">Share Code</h3>
            <p className="mt-1 text-xs text-ink-3">Send your referral code or link to friends</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-paper-3">
            <div className="size-12 mx-auto grid place-items-center rounded-xl bg-[#F7911B]/10 text-[#F7911B]">
              <TargetIcon className="size-6" />
            </div>
            <h3 className="mt-3 font-display font-semibold">Friend Signs Up</h3>
            <p className="mt-1 text-xs text-ink-3">They create an account using your code</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-paper-3">
            <div className="size-12 mx-auto grid place-items-center rounded-xl bg-[#F7911B]/10 text-[#F7911B]">
              <GiftIcon className="size-6" />
            </div>
            <h3 className="mt-3 font-display font-semibold">Both Earn</h3>
            <p className="mt-1 text-xs text-ink-3">You get 100 coins + ₦500, they get 50 coins</p>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule p-5">
          <h2 className="font-display text-lg font-bold">Referral History</h2>
        </div>
        <div className="divide-y divide-rule/50">
          {history.map((h) => (
            <div key={h.name} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-full bg-accent-muted text-xs font-bold text-accent font-display">
                  {h.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">@{h.name}</p>
                  <p className="text-xs text-ink-muted">{h.date}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={h.status === "active" ? "success" : "warning"} dot>
                  {h.status}
                </Badge>
                <p className="mt-0.5 text-xs text-ink-3">{h.reward}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
