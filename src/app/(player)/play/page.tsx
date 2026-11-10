"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui";
import {
  BarChartIcon,
  CheckIcon,
  LockIcon,
  MusicIcon,
  PlayIcon,
  TrophyIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveSessions, type SessionRow } from "@/lib/supabase/queries";
import {
  joinSession,
  getSessionQuestions,
  submitAnswer,
  type SessionQuestion,
} from "@/lib/game/session-service";
import { openSessionResultsPopup } from "@/components/game/SessionResultsPopup";
import {
  isSoundMuted,
  setSoundMuted,
  isBackgroundMusicPlaying,
  stopBackgroundMusic,
  toggleBackgroundMusic,
  playGameStart,
  playOptionSelect,
  playQuestionAdvance,
  playSessionComplete,
} from "@/lib/audio/sound-effects";

function formatStopwatch(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatLiveCountdown(endsAt: string, nowMs: number = Date.now()): string {
  const diff = new Date(endsAt).getTime() - nowMs;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  }
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

const FALLBACK_COLORS = [
  "#3B6FD8",
  "#F07B22",
  "#111111",
  "#6BB343",
  "#9CA3AF",
  "#C8960C",
  "#1E3A5F",
  "#CC0000",
  "#7030A0",
  "#FF00CC",
];

type Phase = "lobby" | "playing" | "result_sample" | "completed";

export default function PlayPage() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [phase, setPhase] = useState<Phase>("lobby");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const syncAudio = () => {
      setSoundMutedState(isSoundMuted());
      setMusicPlaying(isBackgroundMusicPlaying());
    };
    syncAudio();
    window.addEventListener("gw-audio-change", syncAudio);
    const tick = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.removeEventListener("gw-audio-change", syncAudio);
      clearInterval(tick);
      stopBackgroundMusic();
    };
  }, []);

  useEffect(() => {
    if (phase === "lobby" || phase === "completed") {
      stopBackgroundMusic();
    }
  }, [phase]);

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMutedState(next);
    setSoundMuted(next);
  };

  const handleToggleMusic = () => {
    const active = toggleBackgroundMusic();
    setMusicPlaying(active);
  };

  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [liveQuestionMs, setLiveQuestionMs] = useState(0);

  const [lastPick, setLastPick] = useState<{
    option: SessionQuestion["questions"]["question_options"][0];
    questionType: string;
    tookMs: number;
  } | null>(null);

  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [finalStats, setFinalStats] = useState<{
    rank: number;
    points: number;
    responseMs: number;
    prize: number;
  } | null>(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const start = questionStartTime || Date.now();
    const interval = setInterval(() => {
      setLiveQuestionMs(Date.now() - start);
    }, 200);
    return () => clearInterval(interval);
  }, [phase, questionStartTime]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/game/session", { cache: "no-store" });
        if (res.ok && mounted) {
          const data = await res.json();
          if (data.session) {
            setActiveSession(data.session as SessionRow);
            return;
          }
        }
        const sessions = await getActiveSessions();
        if (mounted) {
          setActiveSession(sessions[0] ?? null);
        }
      } catch (err) {
        console.error("Play load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    const poll = setInterval(() => {
      void load();
    }, 4000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [user]);

  const isSessionEnded =
    !activeSession ||
    activeSession.status !== "active" ||
    new Date(activeSession.ends_at).getTime() <= nowMs;

  const requestBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore if blocked by browser policy
    }
  };

  const exitBrowserFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (
      isSessionEnded &&
      (phase === "playing" || phase === "result_sample")
    ) {
      stopBackgroundMusic();
      void exitBrowserFullscreen();
      setPhase("lobby");
      setJoinError(
        "This session just ended. Entries are closed and official results are now ready.",
      );
      if (activeSession?.id) {
        openSessionResultsPopup({
          sessionId: activeSession.id,
          entryId: entryId ?? undefined,
          initialTab: "feedback",
        });
      }
    }
  }, [isSessionEnded, phase, activeSession?.id, entryId]);

  const handleStartPlay = async () => {
    if (!activeSession || joining || isSessionEnded) {
      if (isSessionEnded && activeSession?.id) {
        openSessionResultsPopup({
          sessionId: activeSession.id,
          initialTab: "feedback",
        });
      }
      return;
    }
    setJoining(true);
    setJoinError(null);
    playGameStart();

    void requestBrowserFullscreen();

    try {
      const [eid, qs] = await Promise.all([
        joinSession(activeSession.id, true, user?.id),
        getSessionQuestions(activeSession.id),
      ]);
      setEntryId(eid);
      setQuestions(qs);
      setCurrentIndex(0);
      setTotalTimeMs(0);
      setFinalStats(null);
      setLastPick(null);
      setQuestionStartTime(Date.now());
      setLiveQuestionMs(0);
      setPhase("playing");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Unable to start game. Please try again.";
      setJoinError(msg);
      void exitBrowserFullscreen();
    } finally {
      setJoining(false);
    }
  };

  const advanceToNextQuestion = (
    nextIdx: number,
    isLast: boolean,
    stats?: { rank: number; points: number; responseMs: number; prize: number } | null,
  ) => {
    if (!isLast) {
      playQuestionAdvance();
      setCurrentIndex(nextIdx);
      setLastPick(null);
      setQuestionStartTime(Date.now());
      setLiveQuestionMs(0);
      setPhase("playing");
    } else {
      playSessionComplete();
      if (stats) setFinalStats(stats);
      setPhase("completed");
      if (isSessionEnded && activeSession?.id) {
        setTimeout(() => {
          openSessionResultsPopup({
            sessionId: activeSession.id,
            entryId: entryId ?? undefined,
            initialTab: "feedback",
          });
        }, 280);
      }
    }
  };

  const handleSelectOption = async (
    opt: SessionQuestion["questions"]["question_options"][0],
  ) => {
    if (!entryId || submitting || !activeSession || isSessionEnded) return;
    setSubmitting(true);
    playOptionSelect();

    const responseMs = Math.max(300, Date.now() - questionStartTime);
    const currentQ = questions[currentIndex];
    const isLast = currentIndex >= questions.length - 1;

    setTotalTimeMs((prev) => prev + responseMs);
    setLastPick({
      option: opt,
      questionType: currentQ.questions.type || "text",
      tookMs: responseMs,
    });
    setPhase("result_sample");

    try {
      const result = await submitAnswer(
        entryId,
        currentQ.question_id,
        opt.id,
        responseMs,
        false,
        activeSession.id,
      );

      if (result.sessionEnded) {
        stopBackgroundMusic();
        void exitBrowserFullscreen();
        setActiveSession((prev) =>
          prev ? { ...prev, status: "completed" } : prev,
        );
        setPhase("lobby");
        setJoinError(
          result.error ||
            "This session has ended and is closed for play.",
        );
        openSessionResultsPopup({
          sessionId: activeSession.id,
          entryId: entryId ?? undefined,
          initialTab: "feedback",
        });
        return;
      }

      setTimeout(() => {
        advanceToNextQuestion(currentIndex + 1, isLast, result.myStats ?? null);
      }, 900);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to submit selection";
      setJoinError(msg);
      setPhase("playing");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // 1. Lobby Screen
  if (phase === "lobby" || !activeSession) {
    return (
      <div
        ref={containerRef}
        className="mx-auto max-w-xl py-4 sm:py-10 animate-fade-in"
      >
        <section
          className={`rounded-2xl border bg-[#0d111c] px-5 py-8 sm:px-10 sm:py-12 text-center space-y-6 shadow-[0_16px_50px_rgba(0,0,0,0.4)] ${
            isSessionEnded ? "border-amber-500/30" : "border-emerald-500/20"
          }`}
        >
          {activeSession && !isSessionEnded ? (
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3.5 py-1 text-xs font-semibold text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>Live Session</span>
              <span className="text-emerald-200/60">·</span>
              <span className="font-mono text-white tabular-nums">
                {formatLiveCountdown(activeSession.ends_at, nowMs)} left
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/15 px-3.5 py-1 text-xs font-semibold text-amber-300">
              <LockIcon className="size-3.5" />
              <span>Session Ended · Closed for Play</span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              {isSessionEnded ? "Official Results Ready" : "Free Entry · 10 Questions"}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">
              {activeSession?.name ?? "GuessWhat"}
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {isSessionEnded
                ? "This session is closed for new rounds. View the 10 to 1 crowd vote breakdown and verified winners below."
                : "10 questions with 10 options each. Pick what you think most players will choose in the shortest total time."}
            </p>
          </div>

          {joinError && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-200">
              {joinError}
            </div>
          )}

          {!isSessionEnded ? (
            <div className="pt-1">
              <Button
                size="lg"
                onClick={handleStartPlay}
                disabled={joining || !activeSession || isSessionEnded}
                className="w-full sm:w-auto px-14 py-4 text-base font-bold inline-flex items-center justify-center gap-2.5 shadow-lg"
              >
                <PlayIcon className="size-5 fill-current" />
                <span>{joining ? "Starting..." : "Start Round"}</span>
              </Button>
            </div>
          ) : (
            <div className="pt-1 flex flex-col items-stretch sm:items-center gap-3">
              {activeSession && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() =>
                      openSessionResultsPopup({
                        sessionId: activeSession.id,
                        initialTab: "feedback",
                      })
                    }
                    className="min-h-12 rounded-xl border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 px-6 py-3 text-sm font-bold text-amber-200 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <BarChartIcon className="size-4 text-amber-300" />
                    <span>View Results &amp; Winners</span>
                  </button>

                  <Button
                    variant="secondary"
                    size="lg"
                    href="/leaderboard?tab=winners"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <TrophyIcon className="size-4" />
                    <span>Winners Board</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeSession && (
            <div className="space-y-1 text-xs text-slate-400 pt-1">
              <p>
                Prize Pool:{" "}
                <strong className="text-amber-300">
                  {formatNaira(activeSession.prize_pool)}
                </strong>{" "}
                ·{" "}
                {isSessionEnded
                  ? "Final Leaderboard Unlocked"
                  : "Unlimited Replays for Best Score"}
              </p>
              <p className="text-[11px] text-slate-500">
                {isSessionEnded
                  ? "Inspect every question's vote share and top 36 winners."
                  : "Crowd vote shares stay sealed until the session countdown hits 00:00."}
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  // 2. Result Sample Interstitial
  if (phase === "result_sample" && lastPick) {
    return (
      <div className="mx-auto max-w-2xl py-6 sm:py-10 animate-fade-in">
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] px-5 py-12 sm:px-12 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 items-center text-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Locked In
              </p>
              <div className="flex justify-center">
                {lastPick.questionType === "color" ? (
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="size-16 rounded-full border-2 border-white shadow-lg"
                      style={{
                        backgroundColor: lastPick.option.media_url || "#F7911B",
                      }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {lastPick.option.label}
                    </span>
                  </div>
                ) : (lastPick.questionType === "image" ||
                    (lastPick.option.media_url &&
                      (lastPick.option.media_url.startsWith("http") ||
                        lastPick.option.media_url.startsWith("data:image/")))) &&
                  lastPick.option.media_url ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-40 aspect-[4/3] overflow-hidden rounded-xl border-2 border-accent shadow-lg bg-slate-900">
                      <img
                        src={lastPick.option.media_url}
                        alt={lastPick.option.label}
                        width={320}
                        height={240}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {lastPick.option.label}
                    </span>
                  </div>
                ) : (
                  <div className="min-w-36 rounded-xl border border-accent/35 bg-accent/10 px-6 py-3.5 text-base font-bold text-white">
                    {lastPick.option.label}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Response Time
              </p>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-accent tabular-nums">
                {formatStopwatch(lastPick.tookMs)}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 3. Active Question Display (Mobile-First Ergonomics)
  if (phase === "playing" && questions.length > 0) {
    const currentQ = questions[currentIndex];
    const q = currentQ.questions;
    const qType = q.type || "text";
    const isTextQuestion =
      qType !== "color" && qType !== "number" && qType !== "image";
    const isCompactViewportFill = qType !== "image";
    const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);
    const titleSizeClass = isTextQuestion
      ? q.title.length > 95
        ? "text-xl sm:text-3xl md:text-4xl"
        : "text-[1.65rem] sm:text-3xl md:text-4xl"
      : "text-xl sm:text-2xl md:text-3xl";

    return (
      <div className="mx-auto max-w-4xl py-0.5 sm:py-3 animate-fade-in">
        <section
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121829] to-[#0c101b] p-4 sm:p-8 ${
            isCompactViewportFill
              ? "min-h-[calc(100dvh-9.25rem-env(safe-area-inset-bottom))] sm:min-h-0 flex flex-col gap-4 sm:gap-7"
              : "space-y-5 sm:space-y-8"
          }`}
        >
          {/* Subtle Ambient Stage Glow (Eliminates Flat Dead Space) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full bg-accent/[0.11] blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 size-56 rounded-full bg-[#ff5a1f]/[0.08] blur-3xl"
          />

          {/* Compact Mobile-Safe Top Bar */}
          <div className="relative z-10 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xs sm:text-sm font-semibold tracking-wide text-slate-300">
                Question {currentIndex + 1}{" "}
                <span className="text-slate-500 font-normal">out of {questions.length}</span>
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="rounded-lg bg-white/[0.05] border border-white/10 px-2.5 py-1 font-mono text-sm sm:text-base font-bold text-accent tabular-nums">
                  {formatStopwatch(liveQuestionMs)}
                </span>

                <button
                  type="button"
                  onClick={handleToggleMusic}
                  aria-pressed={musicPlaying}
                  aria-label={musicPlaying ? "Pause background music" : "Play background music"}
                  className={`grid size-9 place-items-center rounded-lg border transition-colors ${
                    musicPlaying
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                  }`}
                >
                  <MusicIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleSound}
                  aria-pressed={!soundMuted}
                  aria-label={soundMuted ? "Unmute sound effects" : "Mute sound effects"}
                  className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white transition-colors"
                >
                  {soundMuted ? (
                    <VolumeMuteIcon className="size-4 text-slate-500" />
                  ) : (
                    <VolumeIcon className="size-4 text-accent" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={isFullscreen ? exitBrowserFullscreen : requestBrowserFullscreen}
                  className="hidden sm:inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-400 hover:text-white"
                >
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </div>
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full gradient-brand transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Hero Question Stage */}
          <div
            className={`relative z-10 text-center space-y-3 ${
              isTextQuestion
                ? "px-1 py-2 sm:py-3 flex flex-col items-center justify-center min-h-[6.5rem] sm:min-h-0"
                : ""
            }`}
          >
            <h2
              className={`font-display ${titleSizeClass} font-extrabold text-white leading-[1.18] tracking-tight max-w-2xl mx-auto`}
            >
              {q.title}
            </h2>
            {q.notes &&
              (q.notes.startsWith("http") || q.notes.startsWith("data:image/")) && (
                <div className="flex justify-center">
                  <img
                    src={q.notes}
                    alt={q.title}
                    width={480}
                    height={300}
                    className="max-h-40 sm:max-h-56 rounded-xl object-cover border border-white/15 shadow-lg"
                  />
                </div>
              )}
          </div>

          {/* 10 Options Filling Space Cleanly Without Dead Gaps */}
          {qType === "color" ? (
            <div className="relative z-10 my-auto grid grid-cols-5 gap-3 sm:gap-6 justify-items-center py-2">
              {q.question_options.map((opt, idx) => {
                const hex =
                  opt.media_url && opt.media_url.startsWith("#")
                    ? opt.media_url
                    : FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSelectOption(opt)}
                    aria-label={opt.label}
                    className="group flex flex-col items-center gap-2 py-1.5 focus:outline-none active:scale-95 transition-transform"
                  >
                    <span
                      className="size-13 sm:size-18 rounded-full border-2 border-white/85 shadow-md transition-transform duration-150 sm:group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-accent"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-xs font-semibold text-slate-200 text-center leading-tight line-clamp-1 max-w-16 sm:max-w-24">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : qType === "number" ? (
            <div className="relative z-10 flex-1 sm:flex-initial grid grid-cols-5 auto-rows-fr gap-2.5 sm:gap-4 max-w-2xl w-full mx-auto py-1">
              {q.question_options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="min-h-16 sm:h-20 rounded-2xl border border-white/15 bg-[#192236] hover:bg-[#222d47] hover:border-accent active:scale-95 active:border-accent active:bg-accent/20 font-display text-2xl sm:text-3xl font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-all duration-150"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : qType === "image" ? (
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4">
              {q.question_options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="group overflow-hidden rounded-xl border border-white/15 bg-[#192236] hover:border-accent active:scale-[0.98] transition-all duration-150 text-left flex flex-col"
                >
                  <div className="aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-slate-900">
                    {opt.media_url ? (
                      <img
                        src={opt.media_url}
                        alt={opt.label}
                        width={400}
                        height={300}
                        loading="eager"
                        className="h-full w-full object-cover transition-transform duration-200 sm:group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs text-slate-500">
                        {opt.label}
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2 text-center">
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-accent line-clamp-1">
                      {opt.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="relative z-10 flex-1 sm:flex-initial grid grid-cols-2 sm:grid-cols-5 auto-rows-fr gap-2.5 sm:gap-3.5">
              {q.question_options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="min-h-14 sm:min-h-15 flex items-center justify-center rounded-2xl border border-white/15 bg-[#192236] hover:bg-[#222d47] hover:border-accent active:scale-[0.98] active:border-accent active:bg-accent/20 px-3.5 py-2.5 text-center text-sm sm:text-[15px] font-bold text-white leading-snug shadow-[0_4px_14px_rgba(0,0,0,0.26)] transition-all duration-150"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // 4. 10/10 Entry Completed Screen
  if (phase === "completed") {
    const isEnded = isSessionEnded;
    return (
      <div className="mx-auto max-w-xl py-4 sm:py-10 animate-fade-in">
        <section className="rounded-2xl border border-emerald-500/20 bg-[#0d111c] p-5 sm:p-9 text-center space-y-5 shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
          <div
            className={`inline-flex flex-wrap items-center justify-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold ${
              isEnded
                ? "border-amber-400/35 bg-amber-500/15 text-amber-300"
                : "border-emerald-400/30 bg-emerald-500/12 text-emerald-300"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isEnded ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span>
              {isEnded
                ? "Session Ended · Official Results"
                : `Live Session · ${formatLiveCountdown(activeSession.ends_at, nowMs)} left`}
            </span>
          </div>

          <div className="mx-auto grid size-13 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <CheckIcon className="size-6 text-emerald-400" />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {isEnded ? "Session Closed" : "All 10 Picks Locked In"}
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {isEnded
                ? "Check the official winners and the 10 to 1 crowd vote breakdown."
                : `Your best score is active on the ${activeSession.name} leaderboard and adjusts live as more players finish.`}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {isEnded ? "Final Rank" : "Current Rank"}
              </p>
              <p className="font-display text-lg sm:text-xl font-bold text-accent mt-0.5 tabular-nums">
                {finalStats ? formatOrdinal(finalStats.rank) : "Live"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Best Score
              </p>
              <p className="font-display text-lg sm:text-xl font-bold text-white mt-0.5 tabular-nums">
                {finalStats ? `${finalStats.points} pts` : "-"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Time
              </p>
              <p className="font-mono text-lg sm:text-xl font-bold text-white mt-0.5 tabular-nums">
                {formatStopwatch(finalStats?.responseMs || totalTimeMs)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {isEnded ? "Prize Won" : "Projected Prize"}
              </p>
              <p className="font-display text-lg sm:text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
                {finalStats && finalStats.prize > 0
                  ? formatNaira(finalStats.prize)
                  : "-"}
              </p>
            </div>
          </div>

          {!isEnded && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3.5 py-3 text-left text-xs text-amber-200 leading-relaxed">
              <LockIcon className="size-4 shrink-0 text-amber-300 mt-0.5" />
              <span>
                Crowd vote shares stay sealed until the countdown hits{" "}
                <strong className="font-mono">00:00:00</strong>. Replay anytime to push for a higher score or faster tiebreak time.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
            {isEnded && (
              <button
                type="button"
                onClick={() =>
                  openSessionResultsPopup({
                    sessionId: activeSession.id,
                    entryId: entryId ?? undefined,
                    initialTab: "feedback",
                  })
                }
                className="min-h-12 rounded-xl border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 px-6 py-3 text-sm font-bold text-amber-200 transition-colors inline-flex items-center justify-center gap-2"
              >
                <BarChartIcon className="size-4 text-amber-300" />
                <span>Results &amp; Crowd Votes</span>
              </button>
            )}
            <span onClick={() => void exitBrowserFullscreen()} className="inline-flex">
              <Button
                size="lg"
                href={isEnded ? "/leaderboard?tab=winners" : "/leaderboard"}
                className="inline-flex items-center justify-center gap-2 w-full"
              >
                <TrophyIcon className="size-4" />
                <span>{isEnded ? "Final Winners" : "Live Leaderboard"}</span>
              </Button>
            </span>
            {!isEnded && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleStartPlay}
              >
                Play Again
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return null;
}
