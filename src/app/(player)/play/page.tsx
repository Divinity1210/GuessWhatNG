"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Badge } from "@/components/ui";
import { TimerIcon, CoinsIcon, TrophyIcon, CheckIcon, ArrowRightIcon, PlayIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveSessions, getUserWallet, type SessionRow, type WalletRow } from "@/lib/supabase/queries";
import {
  joinSession,
  getSessionQuestions,
  submitAnswer,
  getExistingEntry,
  getMyAnswers,
  type SessionQuestion,
} from "@/lib/game/session-service";

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatNaira(n: number) { return `₦${n.toLocaleString()}`; }

type Phase = "lobby" | "playing" | "completed";

export default function PlayPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Lobby state
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Game state
  const [phase, setPhase] = useState<Phase>("lobby");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId: string; responseMs: number }>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [timerStr, setTimerStr] = useState("");

  // Timer
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setTimerStr(timeRemaining(activeSession.ends_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Load lobby
  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [sessions, w] = await Promise.all([
          getActiveSessions(),
          getUserWallet(user!.id),
        ]);
        setWallet(w);
        const session = sessions[0] ?? null;
        setActiveSession(session);

        // Check if already joined
        if (session) {
          const existing = await getExistingEntry(session.id);
          if (existing) {
            if (existing.completed_at) {
              setEntryId(existing.id);
              setPhase("completed");
            } else {
              // Resume game
              const [qs, prevAnswers] = await Promise.all([
                getSessionQuestions(session.id),
                getMyAnswers(existing.id),
              ]);
              setEntryId(existing.id);
              setQuestions(qs);
              setAnswers(prevAnswers);
              const nextUnanswered = qs.findIndex(
                (q) => !prevAnswers[q.question_id],
              );
              setCurrentIndex(nextUnanswered >= 0 ? nextUnanswered : qs.length - 1);
              setQuestionStartTime(Date.now());
              setPhase("playing");
            }
          }
        }
      } catch (err) {
        console.error("Play load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Join session handler
  const handleJoin = async () => {
    if (!activeSession) return;
    setJoining(true);
    setJoinError(null);
    try {
      const eid = await joinSession(activeSession.id);
      const qs = await getSessionQuestions(activeSession.id);
      setEntryId(eid);
      setQuestions(qs);
      setCurrentIndex(0);
      setQuestionStartTime(Date.now());
      setPhase("playing");
      // Refresh wallet after coin deduction
      if (user) {
        const w = await getUserWallet(user.id);
        setWallet(w);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to join session";
      setJoinError(msg);
    } finally {
      setJoining(false);
    }
  };

  // Submit answer handler
  const handleSubmitAnswer = async (optionId: string) => {
    if (!entryId || submitting) return;
    setSelectedOption(optionId);
    setSubmitting(true);

    const responseMs = Date.now() - questionStartTime;
    const currentQ = questions[currentIndex];

    try {
      await submitAnswer(entryId, currentQ.question_id, optionId, responseMs);
      setAnswers((prev) => ({
        ...prev,
        [currentQ.question_id]: { optionId, responseMs },
      }));

      // Brief delay for visual feedback
      await new Promise((r) => setTimeout(r, 400));

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setQuestionStartTime(Date.now());
      } else {
        setPhase("completed");
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Failed to submit answer";
      setJoinError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // ── No active session ──
  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-paper-3">
          <PlayIcon className="size-7 text-ink-muted" />
        </div>
        <h1 className="font-display text-2xl font-bold">No Active Session</h1>
        <p className="mt-2 text-ink-muted max-w-md">There&apos;s no game running right now. Check the sessions page for upcoming games.</p>
        <Button className="mt-6" href="/sessions">View Sessions</Button>
      </div>
    );
  }

  // ── Lobby (pre-join) ──
  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
        <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
          <div className="absolute inset-0 gradient-glow opacity-50" />
          <div className="relative z-10 p-6 md:p-8 space-y-4">
            <Badge variant="active" dot>Live Now</Badge>
            <h1 className="font-display text-2xl font-bold">{activeSession.name}</h1>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 p-3 text-center">
                <TrophyIcon className="size-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xs text-ink-muted">Prize Pool</p>
                <p className="font-display font-bold text-accent">{formatNaira(activeSession.prize_pool)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 p-3 text-center">
                <CoinsIcon className="size-5 text-[#F7911B] mx-auto mb-1" />
                <p className="text-xs text-ink-muted">Entry Fee</p>
                <p className="font-display font-bold text-ink">{activeSession.entry_fee_coins} coins</p>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 p-3 text-center">
                <TimerIcon className="size-5 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-ink-muted">Ends In</p>
                <p className="font-display font-bold text-ink">{timerStr}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 p-3 text-center">
                <p className="text-xs text-ink-muted mt-1">Your Balance</p>
                <p className="font-display font-bold text-ink">{wallet?.coin_balance.toLocaleString() ?? 0} coins</p>
              </div>
            </div>

            {joinError && (
              <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {joinError}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleJoin}
              disabled={joining || (wallet?.coin_balance ?? 0) < activeSession.entry_fee_coins}
            >
              {joining
                ? "Joining..."
                : (wallet?.coin_balance ?? 0) < activeSession.entry_fee_coins
                  ? "Not enough coins"
                  : `Join for ${activeSession.entry_fee_coins} coins`}
            </Button>

            {(wallet?.coin_balance ?? 0) < activeSession.entry_fee_coins && (
              <Button variant="secondary" className="w-full" href="/wallet">
                Buy Coins
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ── Playing ──
  if (phase === "playing" && questions.length > 0) {
    const currentQ = questions[currentIndex];
    const q = currentQ.questions;
    const progress = ((currentIndex) / questions.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        {/* Progress bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 rounded-full bg-paper-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-[#F7911B] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted font-medium whitespace-nowrap">
            {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-xs text-ink-muted flex items-center gap-1">
            <TimerIcon className="size-3.5" /> {timerStr}
          </span>
        </div>

        {/* Question card */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="info">{q.category}</Badge>
            <span className="text-xs text-ink-muted">Question {currentIndex + 1}</span>
          </div>

          <h2 className="font-display text-xl font-bold md:text-2xl">{q.title}</h2>

          <div className="mt-6 space-y-3">
            {q.question_options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isAnswered = !!answers[q.id];
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSubmitAnswer(opt.id)}
                  disabled={submitting || isAnswered}
                  className={`w-full text-left rounded-[var(--radius)] border px-5 py-4 transition-all duration-200 ${
                    isSelected
                      ? "border-accent bg-accent-muted shadow-md scale-[1.01]"
                      : "border-rule bg-paper-3 hover:border-rule-2 hover:bg-paper-2"
                  } ${submitting && !isSelected ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                      isSelected ? "bg-accent text-white" : "bg-paper-2 text-ink-muted border border-rule"
                    }`}>
                      {isSelected ? <CheckIcon className="size-4" /> : String.fromCharCode(65 + opt.position)}
                    </span>
                    <span className={`font-medium ${isSelected ? "text-accent" : "text-ink"}`}>
                      {opt.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // ── Completed ──
  if (phase === "completed") {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="mx-auto max-w-lg text-center space-y-6 animate-fade-in py-10">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-green-500/15">
          <CheckIcon className="size-10 text-green-400" />
        </div>
        <h1 className="font-display text-2xl font-bold">Session Complete!</h1>
        <p className="text-ink-muted">
          You answered {answeredCount} out of {questions.length > 0 ? questions.length : "all"} questions.
          Results will be available once the session closes.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href="/sessions">View Sessions</Button>
          <Button variant="secondary" href="/leaderboard">Leaderboard</Button>
          <Button variant="ghost" href="/dashboard">Dashboard</Button>
        </div>
      </div>
    );
  }

  return null;
}
