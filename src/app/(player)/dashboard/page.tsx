"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Avatar, Button, Badge } from "@/components/ui";
import {
  TrophyIcon,
  TimerIcon,
  PlayIcon,
  ArrowRightIcon,
  BarChartIcon,
  VolumeIcon,
  VolumeMuteIcon,
  MessageSquareIcon,
  UsersIcon,
  HelpCircleIcon,
  ChevronRightIcon,
  InboxIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAuthHeaders } from "@/lib/supabase/client";
import {
  getActiveSessions,
  getSessionLeaderboard,
  getLatestCompletedSessionId,
  type SessionRow,
  type LeaderboardRow,
} from "@/lib/supabase/queries";
import {
  isSoundMuted,
  setSoundMuted,
  playRankClimb,
} from "@/lib/audio/sound-effects";
import { openSessionResultsPopup } from "@/components/game/SessionResultsPopup";
import { openOnboardingTour } from "@/components/game/OnboardingTour";

function formatHeroSessionTitle(name?: string | null): string {
  if (!name) return "Live Session";
  return name.replace(/^guess\s*what\s+(?=session\b)/i, "").trim() || name;
}

function formatHeroCountdown(endsAt: string, nowMs: number = Date.now()): string {
  const diff = new Date(endsAt).getTime() - nowMs;
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  }
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

const HERO_SLIDE_LABELS = [
  "Live session spotlight",
  "Your standing and past results",
  "How GuessWhat works",
] as const;

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardRow[]>([]);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [previousWinners, setPreviousWinners] = useState<LeaderboardRow[]>([]);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);
  const [previousSessionName, setPreviousSessionName] = useState<string>("Previous Session");
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [arenaPreview, setArenaPreview] = useState<{
    recentChat: {
      id: number;
      username: string;
      avatarUrl?: string | null;
      state: string;
      rank: number | null;
      body: string;
    }[];
    topPoll: { id: string; category: string; title: string; totalVotes: number } | null;
  }>({ recentChat: [], topPoll: null });
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [climbedMap, setClimbedMap] = useState<Record<string, number>>({});
  const [guessPulse, setGuessPulse] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroAnnouncement, setHeroAnnouncement] = useState("");
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const heroTrackRef = useRef<HTMLDivElement | null>(null);
  const activeSlideRef = useRef(0);
  const settledSlideRef = useRef(0);
  const pendingSlideRef = useRef<number | null>(null);

  useEffect(() => {
    setSoundMutedState(isSoundMuted());
    const tick = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMutedState(next);
    setSoundMuted(next);
  };

  const applyLeaderboardUpdate = useCallback(
    (nextRows: LeaderboardRow[], nextGuesses: number | ((prev: number) => number)) => {
      const prevMap = prevRanksRef.current;
      const newClimbs: Record<string, number> = {};
      let someoneClimbed = false;

      for (const r of nextRows) {
        const oldRank = prevMap.get(r.user_id);
        if (oldRank !== undefined && r.rank < oldRank) {
          newClimbs[r.user_id] = oldRank - r.rank;
          someoneClimbed = true;
        }
        prevMap.set(r.user_id, r.rank);
      }

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const commitUpdate = () => {
        setLiveLeaderboard(nextRows);
        setTotalGuesses(nextGuesses);
        if (someoneClimbed) {
          setClimbedMap(newClimbs);
          setGuessPulse(true);
          playRankClimb();
        }
      };

      if (
        someoneClimbed &&
        !prefersReducedMotion &&
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(
          commitUpdate,
        );
      } else {
        commitUpdate();
      }

      if (someoneClimbed) {
        setTimeout(() => {
          setClimbedMap({});
          setGuessPulse(false);
        }, 2600);
      }
    },
    [],
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/game/session", { cache: "no-store" });
        let completedSessionFromApi: SessionRow | null = null;
        let primarySession: SessionRow | null = null;

        if (res.ok) {
          const data = await res.json();
          primarySession = (data.session as SessionRow) ?? null;
          setActiveSession(primarySession);

          const initial = ((data.leaderboard ?? []) as LeaderboardRow[]).slice(0, 6);
          for (const r of initial) {
            prevRanksRef.current.set(r.user_id, r.rank);
          }
          setLiveLeaderboard(initial);
          setTotalGuesses(data.totalGuesses ?? 0);

          if (Array.isArray(data.sessions)) {
            const completedList = (data.sessions as SessionRow[]).filter(
              (s) => s.status === "completed",
            );
            completedSessionFromApi =
              completedList.find((s) => s.id !== primarySession?.id) ??
              completedList[0] ??
              null;
          }
        } else {
          const activeSessions = await getActiveSessions();
          primarySession = activeSessions[0] ?? null;
          setActiveSession(primarySession);
        }

        const latestCompletedId =
          completedSessionFromApi?.id ?? (await getLatestCompletedSessionId());
        if (completedSessionFromApi?.name) {
          setPreviousSessionName(completedSessionFromApi.name);
        }
        if (latestCompletedId) {
          setPreviousSessionId(latestCompletedId);
          const prevLb = await getSessionLeaderboard(latestCompletedId, 3);
          setPreviousWinners(prevLb.slice(0, 3));
        }

        const authHeaders = await getAuthHeaders();
        const [inboxRes, commRes] = await Promise.all([
          fetch(`/api/inbox?userId=${encodeURIComponent(user?.id ?? "")}`, {
            cache: "no-store",
            headers: authHeaders,
          }).catch(() => null),
          fetch(`/api/community?userId=${encodeURIComponent(user?.id ?? "")}`, {
            cache: "no-store",
            headers: authHeaders,
          }).catch(() => null),
        ]);
        if (inboxRes && inboxRes.ok) {
          const inboxData = await inboxRes.json();
          if (typeof inboxData.unreadCount === "number") {
            setUnreadInboxCount(inboxData.unreadCount);
          }
        }
        if (commRes && commRes.ok) {
          const commData = await commRes.json();
          const recentChat = ((commData.liveChat ?? []) as {
            id: number;
            username: string;
            avatarUrl?: string | null;
            state: string;
            rank: number | null;
            body: string;
            isSystem?: boolean;
          }[])
            .filter((m) => !m.isSystem)
            .slice(-3)
            .reverse();
          const topPoll =
            ((commData.posts ?? []) as {
              id: string;
              kind: string;
              category: string;
              title: string;
              totalVotes: number;
            }[]).find((p) => p.kind === "poll" || p.kind === "sponsored_poll") ?? null;
          setArenaPreview({ recentChat, topPoll });
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  useEffect(() => {
    if (!activeSession || livePaused) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/game/session?sessionId=${encodeURIComponent(activeSession.id)}`,
          { cache: "no-store", priority: "low" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.session) {
          setActiveSession(data.session as SessionRow);
        }
        const serverRows = ((data.leaderboard ?? []) as LeaderboardRow[]).slice(0, 6);
        applyLeaderboardUpdate(serverRows, data.totalGuesses ?? 0);
      } catch {
        // Ignore transient network errors
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [activeSession, livePaused, applyLeaderboardUpdate]);

  const scrollToHeroSlide = useCallback((targetIndex: number) => {
    const track = heroTrackRef.current;
    if (!track) return;
    const total = HERO_SLIDE_LABELS.length;
    const nextIdx = ((targetIndex % total) + total) % total;
    pendingSlideRef.current = nextIdx;
    activeSlideRef.current = nextIdx;
    setActiveSlide(nextIdx);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    track.scrollTo({
      left: nextIdx * track.clientWidth,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (prefersReducedMotion) {
      pendingSlideRef.current = null;
      if (settledSlideRef.current !== nextIdx) {
        settledSlideRef.current = nextIdx;
        setHeroAnnouncement(`Slide ${nextIdx + 1} of ${total}: ${HERO_SLIDE_LABELS[nextIdx]}`);
      }
    }
  }, []);

  useEffect(() => {
    const track = heroTrackRef.current;
    if (!track) return;

    let rafId: number | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const supportsScrollEnd = "onscrollend" in window;

    const handleSettled = () => {
      const width = Math.max(track.clientWidth, 1);
      const nearest = Math.min(
        HERO_SLIDE_LABELS.length - 1,
        Math.max(0, Math.round(track.scrollLeft / width)),
      );
      pendingSlideRef.current = null;
      if (activeSlideRef.current !== nearest) {
        activeSlideRef.current = nearest;
        setActiveSlide(nearest);
      }
      if (settledSlideRef.current !== nearest) {
        settledSlideRef.current = nearest;
        setHeroAnnouncement(
          `Slide ${nearest + 1} of ${HERO_SLIDE_LABELS.length}: ${HERO_SLIDE_LABELS[nearest]}`,
        );
      }
    };

    const handleScroll = () => {
      if (pendingSlideRef.current === null && rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const width = Math.max(track.clientWidth, 1);
          const nearest = Math.min(
            HERO_SLIDE_LABELS.length - 1,
            Math.max(0, Math.round(track.scrollLeft / width)),
          );
          if (activeSlideRef.current !== nearest) {
            activeSlideRef.current = nearest;
            setActiveSlide(nearest);
          }
        });
      }

      if (!supportsScrollEnd) {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(handleSettled, 140);
      }
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    if (supportsScrollEnd) {
      track.addEventListener("scrollend", handleSettled);
    }

    return () => {
      track.removeEventListener("scroll", handleScroll);
      if (supportsScrollEnd) {
        track.removeEventListener("scrollend", handleSettled);
      }
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const getPlayerDisplay = (row: LeaderboardRow) => {
    const isMe = Boolean(user?.id && row.user_id === user.id);
    const name =
      row.profiles?.username || (isMe ? profile?.username : null) || "Player";
    const avatarUrl =
      row.profiles?.avatar_url || (isMe ? profile?.avatar_url : null) || null;
    return { name, avatarUrl, isMe };
  };

  const myRow = liveLeaderboard.find((r) => r.user_id === user?.id);
  const isSessionEnded =
    !activeSession ||
    activeSession.status !== "active" ||
    new Date(activeSession.ends_at).getTime() <= nowMs;

  return (
    <div className="space-y-5 sm:space-y-7 animate-fade-in">
      {/* Decluttered 3-Slide Hero Carousel */}
      <section
        data-tour="live-session"
        aria-roledescription="carousel"
        aria-label="Session highlights"
        className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b from-[#141a29] via-[#0e121e] to-[#0a0d16] shadow-[0_16px_48px_rgba(0,0,0,0.42)] ${
          isSessionEnded ? "border-amber-500/25" : "border-white/10"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[#F7911B]/[0.1] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-[#ec5812]/[0.08] blur-3xl"
        />

        {/* Desktop Prev / Next Controls (DOM order before track per guidance) */}
        <div className="pointer-events-none absolute inset-y-0 inset-x-3 z-20 hidden sm:flex items-center justify-between">
          <button
            type="button"
            onClick={() => scrollToHeroSlide(activeSlide - 1)}
            aria-label="Previous slide"
            className="pointer-events-auto grid size-9 place-items-center rounded-full border border-white/15 bg-[#0a0d16]/85 text-slate-300 hover:border-accent/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb95b] [touch-action:manipulation] transition-colors"
          >
            <ChevronRightIcon className="size-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollToHeroSlide(activeSlide + 1)}
            aria-label="Next slide"
            className="pointer-events-auto grid size-9 place-items-center rounded-full border border-white/15 bg-[#0a0d16]/85 text-slate-300 hover:border-accent/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb95b] [touch-action:manipulation] transition-colors"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        {/* Horizontal Scroll-Snap Track */}
        <div
          ref={heroTrackRef}
          tabIndex={0}
          role="group"
          aria-label="Slides"
          className="relative z-10 flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar [touch-action:manipulation] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ffb95b]"
        >
          {/* Slide 1: Focused Live Session Card */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="1 of 3"
            className="min-w-full shrink-0 snap-center px-5 pt-7 pb-3 sm:px-14 sm:pt-9 sm:pb-4 flex flex-col items-center justify-center text-center gap-4"
          >
            {!isSessionEnded ? (
              <Badge variant="active" dot className="px-3.5 py-1">
                Live Now · Free Entry
              </Badge>
            ) : (
              <Badge variant="warning" dot className="px-3.5 py-1">
                Session Ended · Results Ready
              </Badge>
            )}

            <div className="space-y-1.5">
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {formatHeroSessionTitle(activeSession?.name)}
              </h1>
              <p className="text-sm text-slate-300">
                {isSessionEnded
                  ? "Official crowd results and winners are ready."
                  : "Pick what most players will choose."}
              </p>
            </div>

            <div className="mx-auto w-full max-w-md rounded-2xl bg-gradient-to-b from-[#f5841f] via-[#ec5812] to-[#d9330a] px-6 py-5 sm:py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_30px_rgba(236,88,18,0.28)]">
              <div className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white/95">
                <TrophyIcon className="size-4" />
                <span>Prize Pool</span>
              </div>
              <p className="mt-1 font-display text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums leading-none">
                {formatNaira(activeSession?.prize_pool ?? 500_000)}
              </p>
            </div>

            <dl className="mx-auto grid w-full max-w-md grid-cols-2 items-center divide-x divide-white/[0.12] py-1">
              <div className="flex items-center justify-center gap-2.5 pr-3">
                <UsersIcon className="size-4.5 text-slate-300 shrink-0" />
                <div className="text-left">
                  <dt className="text-[11px] font-medium text-slate-400 leading-tight">
                    {isSessionEnded ? "Total Guesses" : "Live Guesses"}
                  </dt>
                  <dd
                    className={`font-display text-base sm:text-lg font-bold tabular-nums leading-tight mt-0.5 transition-colors duration-300 ${
                      guessPulse ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {totalGuesses.toLocaleString()}
                  </dd>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 pl-3">
                <TimerIcon className="size-4.5 text-slate-300 shrink-0" />
                <div className="text-left">
                  <dt className="text-[11px] font-medium text-slate-400 leading-tight">
                    {isSessionEnded ? "Status" : "Ends In"}
                  </dt>
                  <dd className="font-display text-base sm:text-lg font-bold text-white tabular-nums leading-tight mt-0.5">
                    {activeSession
                      ? isSessionEnded
                        ? "Closed"
                        : formatHeroCountdown(activeSession.ends_at, nowMs)
                      : "Open"}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="w-full max-w-md mx-auto pt-1">
              {!isSessionEnded ? (
                <Button
                  size="lg"
                  href="/play"
                  className="w-full min-h-12 rounded-2xl text-base font-bold inline-flex items-center justify-center gap-2.5 shadow-[0_8px_28px_rgba(247,145,27,0.28)]"
                >
                  <PlayIcon className="size-4.5 fill-current" />
                  <span>
                    {myRow ? `Play Again · Beat ${myRow.points}p` : "Play Free Now"}
                  </span>
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openSessionResultsPopup({
                      sessionId: activeSession?.id,
                      initialTab: "feedback",
                    })
                  }
                  className="min-h-12 w-full rounded-2xl border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 px-6 py-3 text-base font-bold text-amber-200 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <BarChartIcon className="size-4.5 text-amber-300" />
                  <span>View Results &amp; Winners</span>
                </button>
              )}
            </div>
          </div>

          {/* Slide 2: Personal Standing & Past Results */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="2 of 3"
            className="min-w-full shrink-0 snap-center px-5 pt-7 pb-3 sm:px-14 sm:pt-9 sm:pb-4 flex flex-col items-center justify-center text-center gap-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="gold">Your Standing</Badge>
              {unreadInboxCount > 0 && (
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/35 px-3 py-0.5 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
                >
                  <InboxIcon className="size-3.5" />
                  <span>{unreadInboxCount} new in Inbox</span>
                </Link>
              )}
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {formatHeroSessionTitle(activeSession?.name)} Summary
              </h2>
              <p className="text-sm text-slate-300">
                Your highest round stays safe on the board even when you replay.
              </p>
            </div>

            <dl className="mx-auto w-full max-w-md grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {isSessionEnded ? "Your Rank" : "Your Best"}
                </dt>
                <dd className="mt-1 font-display text-lg sm:text-xl font-bold text-emerald-400 tabular-nums truncate">
                  {myRow ? `${formatOrdinal(myRow.rank)} · ${myRow.points}p` : "Not played"}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {isSessionEnded ? "Prize Won" : "Projected Prize"}
                </dt>
                <dd className="mt-1 font-display text-lg sm:text-xl font-bold text-amber-300 tabular-nums truncate">
                  {myRow && myRow.prize > 0 ? formatNaira(myRow.prize) : "Top 36 Win"}
                </dd>
              </div>
            </dl>

            <div className="w-full max-w-md mx-auto flex flex-col sm:flex-row gap-2.5 pt-1">
              {(previousWinners.length > 0 || previousSessionId) && (
                <button
                  type="button"
                  onClick={() =>
                    openSessionResultsPopup({
                      sessionId: isSessionEnded
                        ? activeSession?.id
                        : previousSessionId ?? undefined,
                      initialTab: "feedback",
                    })
                  }
                  className="flex-1 min-h-12 rounded-2xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-3 text-sm font-bold text-white transition-colors inline-flex items-center justify-center gap-2"
                >
                  <BarChartIcon className="size-4 text-accent" />
                  <span className="truncate">
                    {isSessionEnded ? "Full Breakdown" : `Last Results (${previousSessionName})`}
                  </span>
                </button>
              )}
              <Link
                href="/leaderboard"
                className="flex-1 min-h-12 rounded-2xl gradient-brand px-5 py-3 text-sm font-bold text-white inline-flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <TrophyIcon className="size-4" />
                <span>View Leaderboard</span>
              </Link>
            </div>
          </div>

          {/* Slide 3: How GuessWhat Works Quick Link */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="3 of 3"
            className="min-w-full shrink-0 snap-center px-5 pt-7 pb-3 sm:px-14 sm:pt-9 sm:pb-4 flex flex-col items-center justify-center text-center gap-4"
          >
            <Badge variant="info">Quick Guide</Badge>

            <div className="space-y-1.5 max-w-md">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                How GuessWhat Works
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Pick what the majority chooses across 10 fast questions. Dynamic 10 to 1 crowd scoring plus speed tiebreakers decide the winners.
              </p>
            </div>

            <div className="mx-auto w-full max-w-md grid grid-cols-3 gap-2">
              {[
                { label: "10 Questions", sub: "4 Formats" },
                { label: "10 to 1 Pts", sub: "Live Crowd" },
                { label: "Top 36 Win", sub: "Real Cash" },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-2.5 py-3"
                >
                  <p className="font-display text-xs sm:text-sm font-bold text-white">
                    {chip.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{chip.sub}</p>
                </div>
              ))}
            </div>

            <div className="w-full max-w-lg mx-auto pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => openOnboardingTour()}
                className="min-h-12 sm:flex-1 rounded-2xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-3 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-colors"
              >
                <HelpCircleIcon className="size-4.5 text-accent shrink-0" />
                <span>Take App Tour</span>
              </button>
              <Link
                href="/how-to-play"
                className="min-h-12 sm:flex-[1.3] rounded-2xl border border-accent/40 bg-accent/15 hover:bg-accent/25 px-5 py-3 text-sm sm:text-base font-bold text-accent inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>Read Full How to Play Guide</span>
                <ArrowRightIcon className="size-4 shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* Accessible Polite Slide Status Region */}
        <p className="sr-only" role="status" aria-live="polite">
          {heroAnnouncement}
        </p>

        {/* Bottom Slide Dots (Shape + Colour distinction per WCAG 1.4.1 & >=24px target per WCAG 2.5.8) */}
        <nav
          aria-label="Choose a slide"
          className="relative z-10 flex items-center justify-center gap-1 pb-5 pt-1"
        >
          {HERO_SLIDE_LABELS.map((label, idx) => {
            const isCurrent = activeSlide === idx;
            return (
              <button
                key={label}
                type="button"
                onClick={() => scrollToHeroSlide(idx)}
                aria-label={`Slide ${idx + 1}: ${label}`}
                aria-current={isCurrent ? "true" : undefined}
                className="min-h-6 min-w-6 grid place-items-center cursor-pointer [touch-action:manipulation] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb95b]"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-200 ${
                    isCurrent
                      ? "w-5 bg-[#F7911B]"
                      : "w-2 bg-white/25 hover:bg-white/45"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </section>

      {/* Live / Final Leaderboard */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              {isSessionEnded ? "Final Leaderboard" : "Live Leaderboard"}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                isSessionEnded
                  ? "border-amber-500/30 bg-amber-500/12 text-amber-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isSessionEnded ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span>{isSessionEnded ? "Final" : "Provisional"}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!soundMuted}
              aria-label={soundMuted ? "Unmute sound effects" : "Mute sound effects"}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              {soundMuted ? (
                <VolumeMuteIcon className="size-3.5 text-slate-400" />
              ) : (
                <VolumeIcon className="size-3.5 text-accent" />
              )}
              <span className="hidden sm:inline">{soundMuted ? "Muted" : "Sound"}</span>
            </button>

            {!isSessionEnded && (
              <button
                type="button"
                onClick={() => setLivePaused(!livePaused)}
                aria-pressed={!livePaused}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span
                  className={`size-1.5 rounded-full ${
                    livePaused ? "bg-slate-500" : "bg-emerald-400"
                  }`}
                />
                <span>{livePaused ? "Paused" : "Live"}</span>
              </button>
            )}

            <Link
              href="/leaderboard"
              className="inline-flex h-9 items-center gap-1 px-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <span>See all</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Mobile Compact Rows (<640px) */}
        <div className="space-y-2 sm:hidden">
          {liveLeaderboard.length > 0 ? (
            liveLeaderboard.map((row) => {
              const { name, avatarUrl, isMe } = getPlayerDisplay(row);
              const climbDelta = climbedMap[row.user_id] ?? 0;
              return (
                <div
                  key={row.user_id}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-3 transition-colors ${
                    climbDelta > 0
                      ? "border-emerald-500/35 bg-emerald-500/12"
                      : isMe
                      ? "border-accent/35 bg-accent/10"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 shrink-0 font-display text-xs font-bold tabular-nums ${
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
                      name={name}
                      src={avatarUrl}
                      size="sm"
                      rank={row.rank}
                      showRankBadge={false}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-white">
                          {name}
                        </p>
                        {isMe && (
                          <span className="shrink-0 rounded-full bg-accent/20 border border-accent/40 px-1.5 py-0.5 text-[10px] font-bold text-accent leading-none">
                            You
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-slate-400 tabular-nums">
                        {row.points} pts · {formatDuration(row.response_ms)}
                        {climbDelta > 0 ? ` · +${climbDelta}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                      {row.prize > 0 ? formatNaira(row.prize) : "-"}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              No rounds recorded yet. Tap Play to claim 1st place.
            </p>
          )}
        </div>

        {/* Tablet/Desktop Table (>=640px) */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Session leaderboard"
          className="hidden sm:block overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-medium text-slate-400">
                <th className="py-3 pr-4">Rank</th>
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 pr-4">
                  {isSessionEnded ? "Prize" : "Projected Prize"}
                </th>
                <th className="py-3 pr-4">Points</th>
                <th className="py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {liveLeaderboard.length > 0 ? (
                liveLeaderboard.map((row) => {
                  const { name, avatarUrl, isMe } = getPlayerDisplay(row);
                  const climbDelta = climbedMap[row.user_id] ?? 0;

                  return (
                    <tr
                      key={row.user_id}
                      style={{ viewTransitionName: `dash-lb-${row.user_id.slice(0, 8)}` }}
                      className={`border-b border-white/5 last:border-0 transition-all duration-500 ${
                        climbDelta > 0
                          ? "bg-emerald-500/15 -translate-y-0.5 text-emerald-300 font-semibold"
                          : isMe
                          ? "text-accent font-semibold"
                          : "text-slate-200"
                      }`}
                    >
                      <td className="py-3.5 pr-4 font-display font-bold whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span>{formatOrdinal(row.rank)}</span>
                          {climbDelta > 0 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/25 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                              +{climbDelta}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={name}
                            src={avatarUrl}
                            size="sm"
                            rank={row.rank}
                            showRankBadge={false}
                          />
                          <span className="truncate font-semibold text-white">
                            {name}
                          </span>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 font-medium text-emerald-400 tabular-nums">
                        {row.prize > 0 ? formatNaira(row.prize) : "-"}
                      </td>
                      <td className="py-3.5 pr-4 font-mono font-bold tabular-nums">
                        {row.points}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-400 tabular-nums">
                        {formatDuration(row.response_ms)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                    No rounds recorded yet. Tap Play to claim 1st place.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Community Arena Preview */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <MessageSquareIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
                Community Arena
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Live banter and Nigerian polls
              </p>
            </div>
          </div>

          <Link
            href="/community"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent/15 border border-accent/30 px-3.5 py-2 text-xs font-bold text-accent hover:bg-accent/25 transition-colors"
          >
            <span>Open Arena</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-[#07090e] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Live Chat</span>
              <Link href="/community" className="text-accent hover:underline font-semibold">
                Join chat
              </Link>
            </div>
            {arenaPreview.recentChat.length > 0 ? (
              arenaPreview.recentChat.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-2.5 border-t border-white/[0.05] pt-2.5 first:border-t-0 first:pt-0 text-xs"
                >
                  <Avatar
                    name={m.username}
                    src={m.avatarUrl}
                    size="xs"
                    rank={m.rank ?? undefined}
                    showRankBadge={false}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-white truncate">{m.username}</span>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                        {m.state}
                      </span>
                      {m.rank && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          #{m.rank}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-slate-300">{m.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-2">
                Say hello in the Live Chat room and rep your state.
              </p>
            )}
          </div>

          <Link
            href="/community"
            className="flex flex-col justify-between rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-[#07090e] p-4 hover:border-amber-500/40 transition-colors"
          >
            <div>
              <span className="inline-block rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {arenaPreview.topPoll?.category || "Featured Poll"}
              </span>
              <h3 className="mt-2 text-sm font-bold leading-snug text-white">
                {arenaPreview.topPoll?.title ||
                  "Vote on today's consumer & city rivalry polls"}
              </h3>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {arenaPreview.topPoll
                  ? `${arenaPreview.topPoll.totalVotes.toLocaleString()} votes cast`
                  : "Live state breakdown"}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                <span>Vote now</span>
                <ArrowRightIcon className="size-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Previous Session Winners */}
      {previousWinners.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
                <TrophyIcon className="size-4.5" />
              </span>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Last Session Winners
                </h2>
                <p className="text-xs text-slate-400">
                  Top 3 · {previousSessionName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  openSessionResultsPopup({
                    sessionId: previousSessionId ?? undefined,
                    initialTab: "feedback",
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors"
              >
                <BarChartIcon className="size-3.5 text-accent" />
                <span>Breakdown</span>
              </button>
              <Link
                href="/leaderboard?tab=winners"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <span>All Winners</span>
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {previousWinners.slice(0, 3).map((w) => {
              const { name, avatarUrl } = getPlayerDisplay(w);
              return (
                <div
                  key={w.user_id}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={name}
                      src={avatarUrl}
                      size="sm"
                      rank={w.rank}
                      showRankBadge={false}
                    />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300 leading-tight">
                        {formatOrdinal(w.rank)} Place
                      </span>
                      <p className="truncate text-sm font-semibold text-white mt-0.5">
                        {name}
                      </p>
                      <p className="font-mono text-xs text-slate-400 tabular-nums">
                        {w.points} pts · {formatDuration(w.response_ms)}
                      </p>
                    </div>
                  </div>
                  <span className="font-display text-sm font-bold text-emerald-400 tabular-nums shrink-0">
                    {formatNaira(w.prize)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
