"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui";
import { CheckIcon, PlayIcon, TrophyIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveSessions, type SessionRow } from "@/lib/supabase/queries";
import {
  joinSession,
  getSessionQuestions,
  submitAnswer,
  type SessionQuestion,
} from "@/lib/game/session-service";

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

  // Gameplay state
  const [phase, setPhase] = useState<Phase>("lobby");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Unlimited count-up timer from 0 (Product Document Page 27)
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [liveQuestionMs, setLiveQuestionMs] = useState(0);

  // Result Sample state after each pick (Product Document Page 8)
  const [lastPick, setLastPick] = useState<{
    option: SessionQuestion["questions"]["question_options"][0];
    questionType: string;
    tookMs: number;
  } | null>(null);

  // Cumulative stats at completion
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

  // Stopwatch counting up from 0 during active question (Page 27)
  useEffect(() => {
    if (phase !== "playing") return;
    const start = questionStartTime || Date.now();
    const interval = setInterval(() => {
      setLiveQuestionMs(Date.now() - start);
    }, 200);
    return () => clearInterval(interval);
  }, [phase, questionStartTime]);

  // Load active session
  useEffect(() => {
    async function load() {
      try {
        const sessions = await getActiveSessions();
        setActiveSession(sessions[0] ?? null);
      } catch (err) {
        console.error("Play load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

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

  // Start / Replay session (Page 31: projects fullscreen when PLAY is clicked)
  const handleStartPlay = async () => {
    if (!activeSession) return;
    setJoining(true);
    setJoinError(null);

    await requestBrowserFullscreen();

    try {
      const [eid, qs] = await Promise.all([
        joinSession(activeSession.id, true),
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
      setCurrentIndex(nextIdx);
      setLastPick(null);
      setQuestionStartTime(Date.now());
      setLiveQuestionMs(0);
      setPhase("playing");
    } else {
      if (stats) setFinalStats(stats);
      setPhase("completed");
    }
  };

  const handleSelectOption = async (
    opt: SessionQuestion["questions"]["question_options"][0],
  ) => {
    if (!entryId || submitting || !activeSession) return;
    setSubmitting(true);

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

      setTimeout(() => {
        advanceToNextQuestion(currentIndex + 1, isLast, result.myStats ?? null);
      }, 950);
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

  // ── 1. Clean Lobby Screen (Product Document Page 31) ──
  if (phase === "lobby" || !activeSession) {
    return (
      <div
        ref={containerRef}
        className="mx-auto max-w-xl py-12 animate-fade-in"
      >
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] px-6 py-14 sm:px-12 sm:py-16 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Think &amp; Win · Free to Play
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              GUESS WHAT
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              10 questions · 10 options each. Predict the option that will receive the
              highest number of selections from other players in the shortest time.
            </p>
          </div>

          {joinError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {joinError}
            </div>
          )}

          <div className="pt-2">
            <Button
              size="lg"
              onClick={handleStartPlay}
              disabled={joining || !activeSession}
              className="px-14 py-4 text-base font-bold inline-flex items-center gap-2.5 shadow-lg"
            >
              <PlayIcon className="size-5 fill-current" />
              <span>{joining ? "LOADING..." : "PLAY"}</span>
            </Button>
          </div>

          {activeSession && (
            <p className="text-xs text-slate-500">
              Prize Pool: <strong className="text-slate-300">{formatNaira(activeSession.prize_pool)}</strong> · Free Entry
            </p>
          )}
        </section>
      </div>
    );
  }

  // ── 2. Result Sample Interstitial (Product Document Page 8) ──
  if (phase === "result_sample" && lastPick) {
    return (
      <div className="mx-auto max-w-3xl py-8 animate-fade-in">
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] px-6 py-16 sm:px-12 sm:py-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center text-center">
            <div className="space-y-5">
              <p className="font-display text-xl sm:text-2xl font-semibold text-white">
                Your Selection
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
                    <span className="text-xs font-medium text-slate-300">
                      {lastPick.option.label}
                    </span>
                  </div>
                ) : (
                  <div className="min-w-40 rounded-xl border border-white/20 bg-white/[0.04] px-6 py-3.5 text-base font-semibold text-white">
                    {lastPick.option.label}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <p className="font-display text-xl sm:text-2xl font-semibold text-white">
                Your Time
              </p>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-accent">
                {formatStopwatch(lastPick.tookMs)}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── 3. Active Question Display (Product Document Pages 7, 9, 10, 12, 13, 27, 28) ──
  if (phase === "playing" && questions.length > 0) {
    const currentQ = questions[currentIndex];
    const q = currentQ.questions;
    const qType = q.type || "text";

    return (
      <div className="mx-auto max-w-4xl py-2 sm:py-4 animate-fade-in">
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 sm:p-10 space-y-10">
          {/* Top Bar: Question Number (Left) & Unlimited Count-Up Time from 0 (Right) — Page 27 */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <span className="font-display text-base sm:text-lg font-semibold text-slate-200">
              Question {currentIndex + 1}
            </span>

            <div className="flex items-center gap-4">
              <span className="font-mono text-base sm:text-lg font-semibold text-slate-200">
                Time {formatStopwatch(liveQuestionMs)}
              </span>

              <button
                type="button"
                onClick={isFullscreen ? exitBrowserFullscreen : requestBrowserFullscreen}
                className="hidden sm:inline-flex rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white"
              >
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>
          </div>

          {/* Question Title */}
          <div className="text-center py-2">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-white">
              {q.title}
            </h2>
          </div>

          {/* 10 Options in a 5x2 Grid (2 columns on mobile, 5 columns on desktop) */}
          {qType === "color" ? (
            /* Colour Question Format (Page 9) */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-8 justify-items-center py-4">
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
                    className="group flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <span
                      className="size-16 sm:size-20 rounded-full border-2 border-white/80 shadow-md transition-transform duration-150 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-accent"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-white">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : qType === "number" ? (
            /* Number Question Format (Page 10) */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 max-w-2xl mx-auto py-4">
              {q.question_options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="h-16 sm:h-20 rounded-xl border border-white/20 bg-white/[0.03] hover:border-accent hover:bg-accent/10 font-display text-xl sm:text-2xl font-bold text-white transition-all duration-150"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : qType === "image" ? (
            /* Picture Question Format — Medium size for mobile & desktop (Pages 12, 13, 28) */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-5">
              {q.question_options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="group overflow-hidden rounded-xl border border-white/15 bg-white/[0.03] hover:border-accent transition-all duration-150 text-left flex flex-col"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                    {opt.media_url ? (
                      <img
                        src={opt.media_url}
                        alt={opt.label}
                        loading="eager"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs text-slate-500">
                        {opt.label}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 text-center">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-accent line-clamp-1">
                      {opt.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Text Question Format (Page 7 & 15–16) */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4 py-2">
              {q.question_options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="min-h-14 rounded-xl border border-white/20 bg-white/[0.03] hover:border-accent hover:bg-accent/10 px-4 py-3.5 text-center text-sm font-medium text-white transition-all duration-150"
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

  // ── 4. Session Complete Screen (Product Document Pages 6, 18, 19) ──
  if (phase === "completed") {
    return (
      <div className="mx-auto max-w-xl py-10 animate-fade-in">
        <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-8 sm:p-10 text-center space-y-6">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <CheckIcon className="size-7 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Session Complete
            </h1>
            <p className="text-sm text-slate-400">
              Your 10 predictions have been added to the live session tally.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Position
              </p>
              <p className="font-display text-xl font-bold text-accent mt-0.5">
                {finalStats ? formatOrdinal(finalStats.rank) : "Live"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Points
              </p>
              <p className="font-display text-xl font-bold text-white mt-0.5">
                {finalStats ? finalStats.points : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Total Time
              </p>
              <p className="font-mono text-xl font-bold text-white mt-0.5">
                {formatStopwatch(finalStats?.responseMs || totalTimeMs)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button
              size="lg"
              href="/leaderboard"
              onClick={exitBrowserFullscreen}
              className="inline-flex items-center justify-center gap-2"
            >
              <TrophyIcon className="size-4" />
              <span>View Leaderboard</span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleStartPlay}
            >
              Try Again
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
