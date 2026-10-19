"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
  TimerIcon,
  CoinsIcon,
  TrophyIcon,
  CheckIcon,
  PlayIcon,
  FlameIcon,
  ZapIcon,
} from "@/components/ui/Icons";
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
import { VIRAL_DEMO_QUESTIONS } from "@/lib/game/viral-engine";
import { ViralBragCard } from "@/components/viral/ViralBragModal";
import { VasTopupModal } from "@/components/viral/WalletModals";

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

type Phase = "lobby" | "playing" | "completed" | "practice";

export default function PlayPage() {
  const { user, profile } = useAuth();

  // Lobby state
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showTopup, setShowTopup] = useState(false);

  // Game state
  const [phase, setPhase] = useState<Phase>("lobby");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, { optionId: string; responseMs: number; isLocked2x?: boolean }>
  >({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [liveQuestionMs, setLiveQuestionMs] = useState(0);
  const [timerStr, setTimerStr] = useState("");

  // 2x Confidence Lock ("Sure Pick") state — 1 allowed per session
  const [arm2xLock, setArm2xLock] = useState(false);
  const [lockedQuestionId, setLockedQuestionId] = useState<string | null>(null);

  // Practice Arena state (when no DB session is active or user wants practice)
  const [practiceStep, setPracticeStep] = useState(0);
  const [practicePickedId, setPracticePickedId] = useState<string | null>(null);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceTotalMs, setPracticeTotalMs] = useState(0);
  const [practice2xArmed, setPractice2xArmed] = useState(false);
  const [practice2xUsedStep, setPractice2xUsedStep] = useState<number | null>(null);
  const [practiceDone, setPracticeDone] = useState(false);

  // Session countdown timer
  useEffect(() => {
    if (!activeSession) return;
    setTimerStr(timeRemaining(activeSession.ends_at));
    const interval = setInterval(() => {
      setTimerStr(timeRemaining(activeSession.ends_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Live millisecond speedometer during active question
  useEffect(() => {
    if (phase !== "playing" && phase !== "practice") return;
    if (selectedOption || practicePickedId || practiceDone) return;
    const start = questionStartTime || Date.now();
    const interval = setInterval(() => {
      setLiveQuestionMs(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, questionStartTime, selectedOption, practicePickedId, practiceDone]);

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

        if (session) {
          const existing = await getExistingEntry(session.id);
          if (existing) {
            const [qs, prevAnswers] = await Promise.all([
              getSessionQuestions(session.id),
              getMyAnswers(existing.id),
            ]);
            setEntryId(existing.id);
            setQuestions(qs);
            setAnswers(prevAnswers);

            if (existing.completed_at) {
              setPhase("completed");
            } else {
              const nextUnanswered = qs.findIndex((q) => !prevAnswers[q.question_id]);
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
      setLiveQuestionMs(0);
      setPhase("playing");
      if (user) {
        const w = await getUserWallet(user.id);
        setWallet(w);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
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

    const responseMs = Math.max(300, Date.now() - questionStartTime);
    const currentQ = questions[currentIndex];
    const apply2x = arm2xLock && !lockedQuestionId;

    try {
      await submitAnswer(entryId, currentQ.question_id, optionId, responseMs, apply2x);
      if (apply2x) {
        setLockedQuestionId(currentQ.question_id);
        setArm2xLock(false);
      }
      setAnswers((prev) => ({
        ...prev,
        [currentQ.question_id]: { optionId, responseMs, isLocked2x: apply2x },
      }));

      await new Promise((r) => setTimeout(r, 400));

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setQuestionStartTime(Date.now());
        setLiveQuestionMs(0);
      } else {
        setPhase("completed");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to submit answer";
      setJoinError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Practice Arena handlers
  const startPracticeArena = () => {
    setPracticeStep(0);
    setPracticePickedId(null);
    setPracticeScore(0);
    setPracticeTotalMs(0);
    setPractice2xArmed(false);
    setPractice2xUsedStep(null);
    setPracticeDone(false);
    setQuestionStartTime(Date.now());
    setLiveQuestionMs(0);
    setPhase("practice");
  };

  const handlePracticePick = (optId: string) => {
    if (practicePickedId) return;
    const tookMs = Math.max(350, Date.now() - questionStartTime);
    setPracticePickedId(optId);
    const q = VIRAL_DEMO_QUESTIONS[practiceStep];
    const opt = q.options.find((o) => o.id === optId);
    const useLock = practice2xArmed && practice2xUsedStep === null;
    if (useLock) {
      setPractice2xUsedStep(practiceStep);
      setPractice2xArmed(false);
    }
    const pts = (opt?.points ?? 7) * (useLock ? 2 : 1);
    setPracticeScore((s) => s + pts);
    setPracticeTotalMs((t) => t + tookMs);
  };

  const handlePracticeNext = () => {
    if (practiceStep < VIRAL_DEMO_QUESTIONS.length - 1) {
      setPracticeStep((s) => s + 1);
      setPracticePickedId(null);
      setQuestionStartTime(Date.now());
      setLiveQuestionMs(0);
    } else {
      setPracticeDone(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // ── Practice Arena Mode ──
  if (phase === "practice") {
    if (practiceDone) {
      const timeSec = (practiceTotalMs / 1000).toFixed(1);
      return (
        <div className="mx-auto max-w-xl space-y-6 animate-fade-in py-4">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-black text-emerald-400">
              <CheckIcon className="size-4" />
              <span>PRACTICE ARENA COMPLETE · {practiceScore} / 60 PTS</span>
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              You Scored {practiceScore} Points in {timeSec}s!
            </h1>
            <p className="text-sm text-ink-muted">
              Share your score &amp; debate question with your WhatsApp squad to earn +50 Bonus Coins per signup!
            </p>
          </div>

          <ViralBragCard
            username={profile?.username ?? "Player"}
            turf={profile?.turf ?? "Lagos (Eko)"}
            sessionName="Naija Street Practice Arena"
            prizePool={250_000}
            timeSeconds={timeSec}
            answeredCount={VIRAL_DEMO_QUESTIONS.length}
            used2xLock={practice2xUsedStep !== null}
            challengeQuestion={VIRAL_DEMO_QUESTIONS[0].title}
            referralCode={profile?.referral_code ?? ""}
          />

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={startPracticeArena}>Play Practice Again</Button>
            {activeSession && (
              <Button variant="secondary" onClick={() => setPhase("lobby")}>
                Back to Live Cash Session
              </Button>
            )}
            <Button variant="ghost" href="/dashboard">
              Dashboard
            </Button>
          </div>
        </div>
      );
    }

    const pq = VIRAL_DEMO_QUESTIONS[practiceStep];
    const progress = ((practiceStep + 1) / VIRAL_DEMO_QUESTIONS.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        {/* Progress & Live Speedometer */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2.5 rounded-full bg-paper-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF0400] to-[#F7911B] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted font-bold whitespace-nowrap">
            Q{practiceStep + 1} / {VIRAL_DEMO_QUESTIONS.length}
          </span>
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 font-mono text-xs font-black text-emerald-400 flex items-center gap-1">
            <ZapIcon className="size-3.5" />
            <span>{(liveQuestionMs / 1000).toFixed(1)}s</span>
          </span>
        </div>

        {/* Question Card */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 md:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">{pq.category}</Badge>
              <span className="text-xs text-ink-muted">Street Practice Mode</span>
            </div>

            {practice2xUsedStep === null ? (
              <button
                type="button"
                disabled={!!practicePickedId}
                onClick={() => setPractice2xArmed((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                  practice2xArmed
                    ? "bg-gradient-to-r from-[#FF0400] to-[#F7911B] text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "border border-[#F7911B]/40 bg-[#F7911B]/10 text-[#F7911B] hover:bg-[#F7911B]/20"
                }`}
              >
                <FlameIcon className="size-4" />
                <span>{practice2xArmed ? "🔥 2x SURE LOCK ARMED (20 PTS MAX)" : "Arm 2x Sure Lock (1 Per Game)"}</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-[#F7911B]">
                {practice2xUsedStep === practiceStep ? "🔥 2x Lock Applied!" : "2x Sure Lock Used"}
              </span>
            )}
          </div>

          <h2 className="font-display text-xl font-bold md:text-2xl">{pq.title}</h2>

          <div className="space-y-3">
            {pq.options.map((opt, idx) => {
              const isPicked = practicePickedId === opt.id;
              const isTop = opt.rank === 1;
              const mult = practice2xUsedStep === practiceStep ? 2 : 1;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!practicePickedId}
                  onClick={() => handlePracticePick(opt.id)}
                  className={`w-full text-left relative overflow-hidden rounded-[var(--radius)] border px-5 py-4 transition-all duration-200 ${
                    practicePickedId
                      ? isPicked
                        ? "border-accent bg-accent-muted shadow-md"
                        : "border-rule bg-paper-3/70"
                      : "border-rule bg-paper-3 hover:border-accent/60 hover:bg-paper-2"
                  }`}
                >
                  {practicePickedId && (
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                        isTop
                          ? "bg-gradient-to-r from-[#F7911B]/30 to-[#FF0400]/30"
                          : "bg-white/5"
                      }`}
                      style={{ width: `${opt.crowdPct}%` }}
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-8 place-items-center rounded-full text-xs font-bold shrink-0 ${
                          isPicked
                            ? "bg-accent text-white"
                            : "bg-paper-2 text-ink-muted border border-rule"
                        }`}
                      >
                        {isPicked ? <CheckIcon className="size-4" /> : String.fromCharCode(65 + idx)}
                      </span>
                      <div>
                        <span className={`font-semibold ${isPicked ? "text-white" : "text-ink"}`}>
                          {opt.label}
                        </span>
                        {practicePickedId && (
                          <p className="text-xs text-[#F7911B] font-bold mt-0.5">
                            {isTop ? "👑 #1 Crowd Pick" : `Rank #${opt.rank}`} · +{opt.points * (isPicked ? mult : 1)} pts
                          </p>
                        )}
                      </div>
                    </div>
                    {practicePickedId && (
                      <span className="font-display text-lg font-black text-white">
                        {opt.crowdPct}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {practicePickedId && (
            <div className="pt-3 border-t border-rule flex items-center justify-between">
              <span className="text-sm text-ink-2">
                Running Score: <strong className="text-accent">{practiceScore} pts</strong>
              </span>
              <Button onClick={handlePracticeNext}>
                {practiceStep < VIRAL_DEMO_QUESTIONS.length - 1 ? "Next Question →" : "Finish & Get Receipt →"}
              </Button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── No active session → Offer instant Street Practice Arena ──
  if (!activeSession) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center space-y-6 animate-fade-in">
        <div className="rounded-card border border-[#F7911B]/35 bg-paper-2 p-8 space-y-5">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-accent-muted">
            <FlameIcon className="size-8 text-accent" />
          </div>
          <Badge variant="active" dot>Free Practice Arena Live</Badge>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Warm Up in the Naija Street Arena!
          </h1>
          <p className="text-sm text-ink-2 max-w-md mx-auto">
            While the next 72-hour cash session prepares to open, test your crowd intuition, 2x Sure Lock power-up, and tiebreaker speed on 5 hot cultural questions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button size="lg" onClick={startPracticeArena}>
              <PlayIcon className="size-5 fill-current" />
              <span>Launch 5-Question Street Arena (Free)</span>
            </Button>
            <Button variant="secondary" size="lg" href="/sessions">
              View Session Schedule
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby (pre-join) ──
  if (phase === "lobby") {
    const notEnoughCoins = (wallet?.coin_balance ?? 0) < activeSession.entry_fee_coins;

    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
        <section className="relative overflow-hidden rounded-card border border-rule bg-paper-2">
          <div className="absolute inset-0 gradient-glow opacity-50" />
          <div className="relative z-10 p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <Badge variant="active" dot>Live Now</Badge>
              <span className="rounded-full bg-[#F7911B]/15 border border-[#F7911B]/30 px-3 py-1 text-xs font-bold text-[#F7911B]">
                🔥 Includes 1x Sure Lock (2x Points)
              </span>
            </div>

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
              disabled={joining || notEnoughCoins}
            >
              {joining
                ? "Joining..."
                : notEnoughCoins
                  ? "Not enough coins"
                  : `Join for ${activeSession.entry_fee_coins} coins`}
            </Button>

            {notEnoughCoins && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowTopup(true)}
              >
                ⚡ Instant Airtime Top-Up (MTN / Airtel / Glo / 9mobile)
              </Button>
            )}

            <div className="pt-2 border-t border-rule text-center">
              <button
                type="button"
                onClick={startPracticeArena}
                className="text-xs font-semibold text-[#F7911B] hover:underline"
              >
                Want to warm up first? Play Free 5-Question Street Practice Arena →
              </button>
            </div>
          </div>
        </section>

        {showTopup && user && (
          <VasTopupModal
            userId={user.id}
            onClose={() => setShowTopup(false)}
            onSuccess={async () => {
              const w = await getUserWallet(user.id);
              setWallet(w);
            }}
          />
        )}
      </div>
    );
  }

  // ── Playing ──
  if (phase === "playing" && questions.length > 0) {
    const currentQ = questions[currentIndex];
    const q = currentQ.questions;
    const progress = (currentIndex / questions.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        {/* Progress bar & Live Speedometer */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2.5 rounded-full bg-paper-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-[#F7911B] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted font-medium whitespace-nowrap">
            {currentIndex + 1} / {questions.length}
          </span>
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400 flex items-center gap-1">
            <ZapIcon className="size-3.5" />
            <span>{(liveQuestionMs / 1000).toFixed(1)}s</span>
          </span>
          <span className="text-xs text-ink-muted hidden sm:flex items-center gap-1">
            <TimerIcon className="size-3.5" /> {timerStr}
          </span>
        </div>

        {/* Question card */}
        <section className="rounded-card border border-rule bg-paper-2 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="info">{q.category}</Badge>
              <span className="text-xs text-ink-muted">Question {currentIndex + 1}</span>
            </div>

            {/* 2x Confidence Lock ("Sure Pick") Power-Up Button */}
            {!lockedQuestionId ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setArm2xLock((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                  arm2xLock
                    ? "bg-gradient-to-r from-[#FF0400] to-[#F7911B] text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "border border-[#F7911B]/40 bg-[#F7911B]/10 text-[#F7911B] hover:bg-[#F7911B]/20"
                }`}
              >
                <FlameIcon className="size-4" />
                <span>
                  {arm2xLock ? "🔥 2x SURE LOCK ARMED (Double Points!)" : "Arm 2x Sure Lock (1 per session)"}
                </span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-ink-muted">
                <FlameIcon className="size-3.5 text-[#F7911B]" />
                <span>2x Lock Used</span>
              </span>
            )}
          </div>

          <h2 className="font-display text-xl font-bold md:text-2xl">{q.title}</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Pick the option you predict <strong className="text-white">most players</strong> in this session will choose.
          </p>

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
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                          isSelected
                            ? "bg-accent text-white"
                            : "bg-paper-2 text-ink-muted border border-rule"
                        }`}
                      >
                        {isSelected ? <CheckIcon className="size-4" /> : String.fromCharCode(65 + opt.position)}
                      </span>
                      <span className={`font-medium ${isSelected ? "text-accent" : "text-ink"}`}>
                        {opt.label}
                      </span>
                    </div>
                    {arm2xLock && !lockedQuestionId && (
                      <span className="rounded-full bg-[#F7911B]/20 px-2.5 py-0.5 text-[10px] font-black text-[#F7911B]">
                        2x PTS
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // ── Completed: Viral Lock-In Receipt & WhatsApp Squad Challenge ──
  if (phase === "completed") {
    const answerValues = Object.values(answers);
    const answeredCount = answerValues.length || (questions.length > 0 ? questions.length : 10);
    const totalResponseMs = answerValues.reduce((sum, a) => sum + (a.responseMs || 2200), 0) || 21400;
    const totalSeconds = (totalResponseMs / 1000).toFixed(1);
    const featuredQuestion =
      questions[0]?.questions?.title ??
      "Which Nigerian meal will be chosen by the majority?";

    return (
      <div className="mx-auto max-w-xl text-center space-y-6 animate-fade-in py-6">
        <div className="space-y-2">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-green-500/15">
            <CheckIcon className="size-8 text-green-400" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Predictions Locked In!
          </h1>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            Your answers and speed tiebreaker ({totalSeconds}s) are sealed in the vault. Challenge your WhatsApp group while the pot is live!
          </p>
        </div>

        <ViralBragCard
          username={profile?.username ?? "Player"}
          turf={profile?.turf ?? "Lagos (Eko)"}
          sessionName={activeSession.name}
          prizePool={activeSession.prize_pool}
          timeSeconds={totalSeconds}
          answeredCount={answeredCount}
          used2xLock={!!lockedQuestionId || answerValues.some((a) => a.isLocked2x)}
          challengeQuestion={featuredQuestion}
          referralCode={profile?.referral_code ?? ""}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
          <Button onClick={startPracticeArena}>Play Free Street Arena</Button>
          <Button variant="secondary" href="/leaderboard">
            Turf &amp; Session Ranks
          </Button>
          <Button variant="ghost" href="/dashboard">
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
