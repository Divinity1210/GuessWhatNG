"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Logo } from "@/components/ui";
import {
  CheckIcon,
  CopyIcon,
  PlayIcon,
  ShareIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "@/components/ui/Icons";

type PublicReceipt = {
  id: string;
  sessionName: string;
  payoutType: "session_winner" | "referral_prize" | "bonus";
  username: string;
  fullName?: string;
  hideFullName: boolean;
  state: string;
  position?: number;
  points?: number;
  amount: number;
  bankName: string;
  accountNumberMasked: string;
  transferRef?: string;
  note?: string;
  paidAt: string;
  imageUrl?: string;
};

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function PublicReceiptPage() {
  const params = useParams<{ id: string }>();
  const receiptId = typeof params?.id === "string" ? params.id : "";

  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!receiptId) return;
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}`, {
          cache: "no-store",
        });
        if (!mounted) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (data.receipt) {
          setReceipt(data.receipt as PublicReceipt);
        } else {
          setNotFound(true);
        }
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [receiptId]);

  const currentUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `${process.env.NEXT_PUBLIC_SITE_URL || "https://guesswhat9ja.com"}/receipt/${receiptId}`;

  const shareText = receipt
    ? `Verified Payout on GuessWhat! @${receipt.username} (${receipt.state}) just got paid ₦${receipt.amount.toLocaleString()} for ${receipt.sessionName} (${receipt.bankName} ${receipt.accountNumberMasked}). Receipt #${receipt.id}`
    : "Verified Cash Payout Receipt on GuessWhat!";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: receipt
            ? `GuessWhat Verified Payout: ₦${receipt.amount.toLocaleString()}`
            : "GuessWhat Verified Payout Receipt",
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch {
        // User cancelled share or unsupported
      }
    }
    await handleCopyLink();
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;

  return (
    <div className="min-h-dvh bg-[#07090e] text-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-3">
          <Logo size="sm" href="/" />
          <Link
            href="/play"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all"
          >
            <PlayIcon className="size-3.5 fill-current" />
            <span>Play Free Now</span>
          </Link>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0d111c] py-24">
            <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-xs text-slate-400">Verifying payout receipt...</p>
          </div>
        ) : notFound || !receipt ? (
          <div className="rounded-3xl border border-white/10 bg-[#0d111c] p-8 sm:p-12 text-center space-y-4">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
              Receipt Not Found
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              We could not find a verified GuessWhat payout receipt matching ID{" "}
              <span className="font-mono text-slate-200">{receiptId}</span>.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white"
              >
                <span>Go to GuessWhat</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Verified Status Banner */}
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheckIcon className="size-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-emerald-300">
                    Official Verified GuessWhat Payout
                  </p>
                  <p className="text-[11px] text-emerald-200/80 truncate">
                    Receipt #{receipt.id} confirmed in GuessWhat payout ledger
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-200">
                PAID
              </span>
            </div>

            {/* Branded High-Res PNG Receipt (if uploaded) */}
            {receipt.imageUrl && (
              <div className="rounded-3xl border border-white/12 bg-[#0b101d] p-2.5 sm:p-3 shadow-2xl">
                <img
                  src={receipt.imageUrl}
                  alt={`Verified GuessWhat payout receipt ${receipt.id}`}
                  className="w-full max-h-[620px] rounded-2xl object-contain mx-auto"
                />
              </div>
            )}

            {/* Structured Verification Card */}
            <section className="rounded-3xl border border-white/12 bg-gradient-to-b from-[#121829] to-[#0b0f1a] p-5 sm:p-7 space-y-5 shadow-xl">
              <div className="rounded-2xl border border-accent/35 bg-gradient-to-br from-[#F7911B]/20 via-[#ec5812]/10 to-emerald-500/10 p-5 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                  Cash Prize Paid
                </p>
                <p className="mt-1 font-display text-4xl sm:text-5xl font-black text-white tabular-nums">
                  ₦{receipt.amount.toLocaleString()}
                </p>
                <p className="mt-1.5 text-xs sm:text-sm font-semibold text-emerald-300">
                  {receipt.position ? `${formatOrdinal(receipt.position)} Place · ` : ""}
                  {receipt.sessionName}
                </p>
              </div>

              <dl className="divide-y divide-white/[0.07] text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-slate-400">Winner</dt>
                  <dd className="font-bold text-white text-right">
                    @{receipt.username}
                    {!receipt.hideFullName && receipt.fullName
                      ? ` · ${receipt.fullName}`
                      : ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-slate-400">Location</dt>
                  <dd className="font-semibold text-slate-200">{receipt.state}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-slate-400">Payout Bank</dt>
                  <dd className="font-semibold text-slate-200">
                    {receipt.bankName} ·{" "}
                    <span className="font-mono text-amber-300">
                      {receipt.accountNumberMasked}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-slate-400">Receipt ID</dt>
                  <dd className="font-mono font-bold text-emerald-300">{receipt.id}</dd>
                </div>
                {receipt.transferRef && (
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-400">Transfer Reference</dt>
                    <dd className="font-mono text-slate-200">{receipt.transferRef}</dd>
                  </div>
                )}
                {receipt.points !== undefined && (
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-400">Winning Score</dt>
                    <dd className="font-mono font-bold text-amber-300">
                      {receipt.points} pts
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-slate-400">Date Paid</dt>
                  <dd className="text-slate-200 tabular-nums">
                    {new Date(receipt.paidAt).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
              </dl>

              {receipt.note && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-100 text-center">
                  &ldquo;{receipt.note}&rdquo;
                </div>
              )}

              {/* Share & Download Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {receipt.imageUrl && (
                  <a
                    href={receipt.imageUrl}
                    download={`${receipt.id}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-xs font-extrabold text-slate-950 inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Download PNG</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="min-h-11 rounded-xl gradient-brand px-3 py-2 text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                >
                  <ShareIcon className="size-3.5" />
                  <span>Share</span>
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 rounded-xl border border-emerald-500/35 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-300 inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="min-h-11 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-3 py-2 text-xs font-bold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Viral Player Acquisition CTA */}
            <section className="rounded-3xl border border-accent/30 bg-gradient-to-r from-[#141a2b] to-[#0d111c] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
                  <TrophyIcon className="size-4" />
                  <span>GuessWhat Pays Real Cash</span>
                </div>
                <h2 className="font-display text-lg font-bold text-white">
                  Think you can predict the Nigerian crowd?
                </h2>
                <p className="text-xs text-slate-300">
                  Entry is ₦0. Answer 10 quick questions and climb into the Top 36 cash prize spots.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/sign-up"
                  className="min-h-11 rounded-xl gradient-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-glow inline-flex items-center justify-center whitespace-nowrap hover:brightness-110 transition-all"
                >
                  Sign Up Free
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
