"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowRightIcon,
  CloseIcon,
  HelpCircleIcon,
  PlayIcon,
  StarIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/Icons";

const OPEN_TOUR_EVENT = "gw-open-onboarding";
const PENDING_ONBOARDING_KEY = "gw_pending_onboarding";
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function openOnboardingTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_TOUR_EVENT));
}

export function LaunchTourButton({
  className = "",
  label = "Take App Tour",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openOnboardingTour()}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/12 px-5 py-2.5 text-sm font-semibold text-accent hover:bg-accent/20 transition-colors ${className}`}
    >
      <HelpCircleIcon className="size-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

type TourTargetId =
  | "live-session"
  | "nav-play"
  | "nav-leaderboard"
  | "nav-community"
  | "nav-profile";

type TourStep = {
  id: string;
  target: TourTargetId | null;
  badge: string;
  title: string;
  body: string;
  tip?: string;
};

const ROADMAP_CHIPS = [
  { label: "1. Play Free", sub: "10 quick picks" },
  { label: "2. Score 10 to 1", sub: "Match the crowd" },
  { label: "3. Top 36 Win", sub: "Share prize pool" },
  { label: "4. Refer & Earn", sub: "Extra cash board" },
];

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    badge: "Welcome to GuessWhat",
    title: "Welcome",
    body: "GuessWhat is a free crowd-prediction game where you win real cash prizes. Take this 30-second tour to see how every part of the app works.",
  },
  {
    id: "live-session",
    target: "live-session",
    badge: "Step 1 of 5 · Live Session",
    title: "Check the Live Session & Prize Pool",
    body: "This card shows the active cash Prize Pool, total live guesses, and countdown timer. Entry and replays are 100% free until the clock hits 00:00.",
    tip: "Swipe this card anytime to see your standing and past results.",
  },
  {
    id: "play",
    target: "nav-play",
    badge: "Step 2 of 5 · How to Play",
    title: "Tap Play & Predict the Crowd",
    body: "Answer 10 quick questions across text, pictures, colors, and numbers. Don't pick textbook answers: pick what most other players will choose. #1 crowd pick earns 10 pts down to 1 pt for #10, and faster time wins ties.",
    tip: "Picture options fit your full screen with zero scrolling so you stay fast.",
  },
  {
    id: "leaderboard",
    target: "nav-leaderboard",
    badge: "Step 3 of 5 · Rankings & Replays",
    title: "Climb the Leaderboard Safely",
    body: "Scores update live as more players join. Top 36 players share the cash pool when the session closes. Replaying never lowers your rank because the board only keeps your highest score.",
    tip: "You can also check the Referral Cash Leaderboard tab here.",
  },
  {
    id: "community",
    target: "nav-community",
    badge: "Step 4 of 5 · Arena & Referrals",
    title: "Join Live Banter & Earn Referral Cash",
    body: "Chat with players, vote on community polls, and watch live rank alerts in the Arena. Share your referral link from Referrals to climb the separate Referral Cash Leaderboard whenever invited friends play.",
  },
  {
    id: "profile",
    target: "nav-profile",
    badge: "Step 5 of 5 · Payout Ready",
    title: "Add Your Bank Details & Play!",
    body: "Open Profile to upload your avatar, pick your state badge, and save your Nigerian bank account so any cash prize you win can be paid smoothly. Ready for your first round?",
  },
];

type RectBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type ViewportSize = {
  vw: number;
  vh: number;
};

function findVisibleTarget(tourId: TourTargetId): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour="${tourId}"]`,
  );
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      continue;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return null;
}

function StepIcon({ stepId }: { stepId: string }) {
  switch (stepId) {
    case "live-session":
      return <TrophyIcon className="size-4 text-accent" />;
    case "play":
      return <PlayIcon className="size-4 text-accent fill-current" />;
    case "leaderboard":
      return <TrendingUpIcon className="size-4 text-accent" />;
    case "community":
      return <UsersIcon className="size-4 text-accent" />;
    case "profile":
      return <UserIcon className="size-4 text-accent" />;
    default:
      return <StarIcon className="size-4 text-accent" />;
  }
}

export function OnboardingTour() {
  const { user, session, profile, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ vw: 0, vh: 0 });
  const [openTick, setOpenTick] = useState(0);

  const pendingOpenRef = useRef(false);
  const autoTriggeredUserRef = useRef<string | null>(null);

  const displayName =
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Player";
  const doneKey = user?.id ? `gw_onboarding_done_${user.id}` : null;

  const markCompleted = useCallback(() => {
    try {
      if (doneKey) {
        localStorage.setItem(doneKey, "1");
      }
      localStorage.removeItem(PENDING_ONBOARDING_KEY);
    } catch {
      // Ignore storage failures in private browsing
    }

    if (session?.user && !session.user.user_metadata?.onboarding_completed) {
      void createSupabaseBrowserClient()
        .auth.updateUser({ data: { onboarding_completed: true } })
        .catch(() => null);
    }
  }, [doneKey, session]);

  const handleClose = useCallback(() => {
    markCompleted();
    pendingOpenRef.current = false;
    setIsOpen(false);
  }, [markCompleted]);

  const handleFinishTo = useCallback(
    (href: string) => {
      markCompleted();
      pendingOpenRef.current = false;
      setIsOpen(false);
      router.push(href);
    },
    [markCompleted, router],
  );

  // Request tour launch (navigates to /dashboard first so all targets exist)
  const requestTourLaunch = useCallback(() => {
    pendingOpenRef.current = true;
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    } else {
      setOpenTick((prev) => prev + 1);
    }
  }, [pathname, router]);

  // Listen for manual tour trigger events (from Slide 3 button or How to Play page)
  useEffect(() => {
    const onOpenTour = () => {
      requestTourLaunch();
    };
    window.addEventListener(OPEN_TOUR_EVENT, onOpenTour);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, onOpenTour);
  }, [requestTourLaunch]);

  // Auto-trigger for newly signed-up players or ?tour=1 query param
  useEffect(() => {
    if (authLoading || pathname.startsWith("/play") || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const tourParam = url.searchParams.get("tour");
    const welcomeParam = url.searchParams.get("welcome");

    const cleanSearchParams = (keys: string[]) => {
      let changed = false;
      for (const k of keys) {
        if (url.searchParams.has(k)) {
          url.searchParams.delete(k);
          changed = true;
        }
      }
      if (changed) {
        const nextUrl = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, "", nextUrl);
      }
    };

    if (tourParam === "1") {
      cleanSearchParams(["tour", "welcome"]);
      requestTourLaunch();
      return;
    }

    if (!user || !session || !doneKey) {
      return;
    }

    let localDone = false;
    let pendingLocal = false;
    try {
      localDone = localStorage.getItem(doneKey) === "1";
      pendingLocal = localStorage.getItem(PENDING_ONBOARDING_KEY) === "1";
    } catch {
      // Ignore storage access errors
    }

    if (localDone || user.user_metadata?.onboarding_completed) {
      if (welcomeParam === "1") {
        cleanSearchParams(["welcome"]);
      }
      return;
    }

    if (autoTriggeredUserRef.current === user.id) {
      return;
    }

    const createdAtMs = user.created_at ? new Date(user.created_at).getTime() : 0;
    const isFreshAccountOnDashboard =
      Boolean(createdAtMs) &&
      Date.now() - createdAtMs < NEW_ACCOUNT_WINDOW_MS &&
      pathname === "/dashboard";

    if (welcomeParam === "1" || pendingLocal || isFreshAccountOnDashboard) {
      autoTriggeredUserRef.current = user.id;
      try {
        localStorage.removeItem(PENDING_ONBOARDING_KEY);
      } catch {
        // Ignore
      }
      if (welcomeParam === "1") {
        cleanSearchParams(["welcome"]);
      }
      requestTourLaunch();
    }
  }, [authLoading, user, session, doneKey, pathname, requestTourLaunch]);

  // Execute pending launch once settled on /dashboard
  useEffect(() => {
    if (authLoading || !pendingOpenRef.current || pathname !== "/dashboard") {
      return;
    }
    const timer = setTimeout(() => {
      pendingOpenRef.current = false;
      setStepIndex(0);
      setIsOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [authLoading, pathname, openTick]);

  const activeStep = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];

  // Measure target rect + track resize/scroll while open
  useEffect(() => {
    if (!isOpen) return;

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ vw, vh });

      if (!activeStep.target) {
        setTargetRect(null);
        return;
      }

      const el = findVisibleTarget(activeStep.target);
      if (!el) {
        setTargetRect(null);
        return;
      }

      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      });
    };

    if (activeStep.target === "live-session") {
      const el = findVisibleTarget("live-session");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    measure();
    const raf = requestAnimationFrame(measure);
    const settleTimer = setTimeout(measure, 250);
    const lateTimer = setTimeout(measure, 750);

    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
      clearTimeout(lateTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [isOpen, stepIndex, activeStep.target]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowRight") {
        if (stepIndex < TOUR_STEPS.length - 1) {
          e.preventDefault();
          setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
        }
      } else if (e.key === "ArrowLeft") {
        if (stepIndex > 0) {
          e.preventDefault();
          setStepIndex((i) => Math.max(0, i - 1));
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, stepIndex, handleClose]);

  if (!isOpen) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const resolvedTitle = isFirst ? `Welcome, ${displayName}!` : activeStep.title;

  const pad = 6;
  const { vw, vh } = viewport;

  const isDesktopSidebarTarget = Boolean(
    targetRect &&
      vw >= 768 &&
      targetRect.left < 260 &&
      targetRect.width < 280,
  );
  const isMobileBottomTarget = Boolean(
    targetRect && !isDesktopSidebarTarget && targetRect.bottom > vh - 115,
  );

  let cardPlacementStyle: React.CSSProperties | undefined;
  let cardWidthClass = "w-full max-w-md mx-auto";

  if (targetRect && vw > 0 && vh > 0) {
    if (isDesktopSidebarTarget) {
      const leftPos = targetRect.right + 18;
      const topPos = Math.min(
        Math.max(targetRect.top - 24, 16),
        Math.max(16, vh - 340),
      );
      cardWidthClass = "w-[min(24rem,calc(100vw-290px))]";
      cardPlacementStyle = {
        position: "fixed",
        left: `${leftPos}px`,
        top: `${topPos}px`,
      };
    } else if (isMobileBottomTarget) {
      const bottomOffset = Math.max(vh - targetRect.top + 14, 84);
      cardPlacementStyle = {
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: `${bottomOffset}px`,
      };
    } else if (vh - targetRect.bottom >= 260) {
      cardPlacementStyle = {
        position: "fixed",
        left: "12px",
        right: "12px",
        top: `${targetRect.bottom + 14}px`,
      };
    } else if (targetRect.top >= 260) {
      cardPlacementStyle = {
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: `${vh - targetRect.top + 14}px`,
      };
    } else {
      cardPlacementStyle = {
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "16px",
      };
    }
  }

  const cardElement = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gw-onboarding-title"
      aria-describedby="gw-onboarding-body"
      style={cardPlacementStyle}
      className={`z-[62] ${cardWidthClass} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-[#151c2e] to-[#0c101b] p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.72)] animate-fade-in`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#F7911B]/35 bg-[#F7911B]/12 px-3 py-1 text-[11px] font-semibold text-[#ffb95b]">
          <StepIcon stepId={activeStep.id} />
          <span>{activeStep.badge}</span>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close onboarding tour"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      {/* Title & Copy */}
      <div className="mt-4 space-y-2.5">
        <h2
          id="gw-onboarding-title"
          className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug"
        >
          {resolvedTitle}
        </h2>
        <p
          id="gw-onboarding-body"
          className="text-sm text-slate-300 leading-relaxed"
        >
          {activeStep.body}
        </p>
      </div>

      {/* Welcome 4-Step Quick Roadmap */}
      {isFirst && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {ROADMAP_CHIPS.map((chip) => (
            <div
              key={chip.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <p className="font-display text-xs font-bold text-white">
                {chip.label}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{chip.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Highlight Tip Pill */}
      {activeStep.tip && (
        <div className="mt-3.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-200 leading-snug">
          {activeStep.tip}
        </div>
      )}

      {/* Progress Dots */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Onboarding steps"
        >
          {TOUR_STEPS.map((s, idx) => {
            const active = idx === stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Go to ${s.badge}`}
                onClick={() => setStepIndex(idx)}
                className="min-h-6 min-w-4 grid place-items-center cursor-pointer"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-200 ${
                    active
                      ? "w-5 bg-[#F7911B]"
                      : idx < stepIndex
                        ? "w-2 bg-[#F7911B]/55"
                        : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
          {stepIndex + 1} / {TOUR_STEPS.length}
        </span>
      </div>

      {/* Action Buttons */}
      {isLast ? (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleFinishTo("/play")}
            className="min-h-11 w-full rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
          >
            <PlayIcon className="size-4 fill-current" />
            <span>Play My First Round</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => handleFinishTo("/profile")}
              className="flex-1 min-h-10 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <UserIcon className="size-3.5 text-accent" />
              <span>Set Up Profile First</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {isFirst ? "Skip for now" : "Skip"}
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="min-h-10 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1))
              }
              className="min-h-10 rounded-xl gradient-brand px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all inline-flex items-center gap-1.5"
            >
              <span>{isFirst ? "Start Tour" : "Next"}</span>
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60]">
      {targetRect && vw > 0 && vh > 0 ? (
        <>
          {/* Click blocker backdrop */}
          <div className="fixed inset-0 z-[60]" aria-hidden="true" />
          {/* Glowing Spotlight Cutout */}
          <div
            aria-hidden="true"
            className="fixed z-[61] pointer-events-none rounded-2xl border-2 border-[#F7911B] shadow-[0_0_0_9999px_rgba(4,6,12,0.8),0_0_24px_rgba(247,145,27,0.45)] transition-all duration-300"
            style={{
              top: `${Math.max(4, targetRect.top - pad)}px`,
              left: `${Math.max(4, targetRect.left - pad)}px`,
              width: `${Math.min(vw - 8, targetRect.width + pad * 2)}px`,
              height: `${Math.min(vh - 8, targetRect.height + pad * 2)}px`,
            }}
          />
          {cardElement}
        </>
      ) : (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#04060c]/82 p-3 sm:p-4 backdrop-blur-xs">
          {cardElement}
        </div>
      )}
    </div>
  );
}
