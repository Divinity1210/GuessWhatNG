"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAuthHeaders } from "@/lib/supabase/client";
import {
  CheckIcon,
  CloseIcon,
  MessageSquareIcon,
  StarIcon,
} from "@/components/ui/Icons";

const OPEN_FEEDBACK_EVENT = "gw-open-feedback";
const SUBMITTED_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const DISMISSED_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const RATING_LABELS: Record<number, string> = {
  1: "Needs work",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Love it!",
};

const IMPROVEMENT_CHIPS = [
  "Bigger Prize Pools",
  "New Question Types",
  "Faster Gameplay",
  "More Community Features",
  "Better Referral Rewards",
  "Faster Payouts",
  "Bug / UI Fix",
];

export function openFeedbackPopup() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT));
}

export function OpenFeedbackButton({
  className = "",
  label = "Quick Feedback",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openFeedbackPopup()}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-indigo-400/35 bg-indigo-500/12 px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20 transition-colors ${className}`}
    >
      <MessageSquareIcon className="size-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function FeedbackPopup() {
  const { user, session, loading: authLoading } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRealUser = Boolean(user?.id && session && user.id !== "demo-naija-player");

  const resetForm = useCallback(() => {
    setRating(5);
    setSelectedChips([]);
    setNote("");
    setSubmitted(false);
    setErrorMsg(null);
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setOpen(true);
  }, [resetForm]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    if (user?.id) {
      try {
        localStorage.setItem(
          `gw_feedback_dismissed_at_${user.id}`,
          String(Date.now()),
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [user?.id]);

  // Listen for manual open trigger
  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener(OPEN_FEEDBACK_EVENT, handler);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, handler);
  }, [openModal]);

  // Randomized, non-intrusive auto-prompt + ?feedback=1 direct preview
  useEffect(() => {
    if (authLoading || typeof window === "undefined") return;
    if (pathname.startsWith("/play") || pathname.startsWith("/receipt")) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("feedback") === "1") {
      url.searchParams.delete("feedback");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      openModal();
      return;
    }

    if (!isRealUser || !user?.id) return;

    try {
      const submittedAt = Number(
        localStorage.getItem(`gw_feedback_submitted_at_${user.id}`) || "0",
      );
      if (submittedAt && Date.now() - submittedAt < SUBMITTED_COOLDOWN_MS) {
        return;
      }

      const dismissedAt = Number(
        localStorage.getItem(`gw_feedback_dismissed_at_${user.id}`) || "0",
      );
      if (dismissedAt && Date.now() - dismissedAt < DISMISSED_COOLDOWN_MS) {
        return;
      }

      const visitsKey = `gw_feedback_visits_${user.id}`;
      const visits = Number(localStorage.getItem(visitsKey) || "0") + 1;
      localStorage.setItem(visitsKey, String(visits));

      // Wait until user has seen at least 2 pages so brand-new users aren't interrupted immediately
      if (visits < 2) return;

      // Only roll once per browser session so it feels natural and occasional
      if (sessionStorage.getItem("gw_feedback_rolled") === "1") return;
      sessionStorage.setItem("gw_feedback_rolled", "1");

      // 45% random chance on an eligible session
      if (Math.random() > 0.45) return;

      const delayMs = 14_000 + Math.floor(Math.random() * 10_000);
      const timer = setTimeout(() => {
        // Never overlap active onboarding tour or play screen
        if (document.querySelector('[aria-labelledby="gw-onboarding-title"]')) {
          return;
        }
        openModal();
      }, delayMs);

      return () => clearTimeout(timer);
    } catch {
      // Ignore storage access failures
    }
  }, [authLoading, isRealUser, user?.id, pathname, openModal]);

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isRealUser || !user?.id) {
      setErrorMsg("Please sign in so we can save your feedback to your account.");
      return;
    }

    const cleanNote = note.trim();
    if (!cleanNote && selectedChips.length === 0) {
      setErrorMsg("Pick at least one topic or write a quick suggestion below.");
      return;
    }

    setSubmitting(true);
    try {
      const topicSummary =
        selectedChips.length > 0 ? selectedChips.slice(0, 3).join(", ") : "Platform Suggestion";
      const subject = `Quick Feedback: ${topicSummary}`;
      const bodyParts = [
        selectedChips.length > 0 ? `Requested areas: ${selectedChips.join(", ")}` : "",
        `Page: ${pathname}`,
        cleanNote ? `\nPlayer note:\n${cleanNote}` : "",
      ].filter(Boolean);

      const res = await fetch("/api/support", {
        method: "POST",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          userId: user.id,
          category: "feedback",
          rating,
          subject,
          message: bodyParts.join("\n"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not submit feedback right now.");
      }

      try {
        localStorage.setItem(
          `gw_feedback_submitted_at_${user.id}`,
          String(Date.now()),
        );
      } catch {
        // Ignore storage errors
      }

      setSubmitted(true);
      window.dispatchEvent(new CustomEvent("gw-inbox-updated"));
      setTimeout(() => {
        setOpen(false);
      }, 1900);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[58] flex items-end sm:items-center justify-center bg-[#04060c]/80 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gw-feedback-title"
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-[#151c2e] to-[#0c101b] p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.72)]">
        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/35">
              <CheckIcon className="size-6 text-emerald-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Thank you for helping us improve!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
              Your ideas go straight to the GuessWhat team as we build the next updates.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F7911B]/35 bg-[#F7911B]/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffb95b]">
                  Help Us Improve GuessWhat
                </span>
                <h2
                  id="gw-feedback-title"
                  className="font-display text-lg sm:text-xl font-bold text-white leading-snug"
                >
                  What would you like to see here?
                </h2>
                <p className="text-xs text-slate-400">
                  Takes 15 seconds. Tell us what would make GuessWhat even better for you.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close feedback popup"
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/12 px-3.5 py-2 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            {/* Star Rating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  How is your experience so far?
                </span>
                <span className="font-bold text-amber-300">
                  {RATING_LABELS[rating]}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} out of 5 stars`}
                      className={`min-h-10 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                        active
                          ? "border-amber-400/50 bg-amber-500/18 text-amber-300"
                          : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <StarIcon className="size-3.5" />
                      <span>{star}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick-Pick Topic Chips */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">
                What should we focus on next?{" "}
                <span className="text-slate-500 font-normal">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {IMPROVEMENT_CHIPS.map((chip) => {
                  const selected = selectedChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        selected
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {selected ? `✓ ${chip}` : chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Open Feedback Prompt */}
            <div className="space-y-1.5">
              <label
                htmlFor="gw-feedback-note"
                className="block text-xs font-semibold text-slate-300"
              >
                Anything else you&apos;d like added or improved?
              </label>
              <textarea
                id="gw-feedback-note"
                rows={3}
                maxLength={800}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. More football questions, daily mini-sessions, instant OPay transfer..."
                className="w-full rounded-xl border border-white/12 bg-[#07090e] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Maybe later
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 rounded-xl gradient-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-glow hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {submitting ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
