"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
  TimerIcon,
  CheckIcon,
  PlayIcon,
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

  // 2x Multiplier state — 1 allowed per session
  const [arm2xLock, setArm2xLock] = useState(false);
  const [lockedQuestionId, setLockedQuestionId] = useState<string | null>(null);

  // Practice Arena state
  const [practiceStep, setPracticeStep] = useState(0);
  const [practicePickedId, setPracticePickedId] = useState<string | null>(null);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceTotalMs, setPracticeTotalMs] = useState(0);
  const [practice2xArmed, setPractice2xArmed] = useState(false);
  const [practice2xUsedStep, setPractice2xUsedStep] = useState<number | null>(null);
  const [practiceDone, setPracticeDone] = useState(false);

  useEffect(() => {
    if (!activeSession) return;
    setTimerStr(timeRemaining(activeSession.ends_at));
    const interval = setInterval(() => {
      setTimerStr(timeRemaining(activeSession.ends_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (phase !== "playing" && phase !== "practice") return;
    if (selectedOption || practicePickedId || practiceDone) return;
    const start = questionStartTime || Date.now();
    const interval = setInterval(() => {
      setLiveQuestionMs(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, questionStartTime, selectedOption, practicePickedId, practiceDone]);

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

      await new Promise((r) => setTimeout(r, 350));

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
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
      </div>
    );
  }

  // ── Practice Arena Mode ──
  if (phase === "practice") {
    if (practiceDone) {
      const timeSec = (practiceTotalMs / 1000).toFixed(1);
      return (
        <div className="mx-auto max-w-xl space-y-5 animate-fade-in py-4">
          <div className="space-y-1">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#10B981]">
              PRACTICE SLIP SETTLED · {practiceScore} / 60 PTS
            </span>
            <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
              {practiceScore} Points in {timeSec}s
            </h1>
            <p className="text-xs text-[#8A92A6]">
              Share your verification receipt with your division to earn +50 GW Coins per verified signup.
            </p>
          </div>

          <ViralBragCard
            username={profile?.username ?? "Player"}
            turf={profile?.turf ?? "Lagos (Eko)"}
            sessionName="Naija Consensus Practice Arena"
            prizePool={250_000}
            timeSeconds={timeSec}
            answeredCount={VIRAL_DEMO_QUESTIONS.length}
            used2xLock={practice2xUsedStep !== null}
            challengeQuestion={VIRAL_DEMO_QUESTIONS[0].title}
            referralCode={profile?.referral_code ?? ""}
          />

          <div className="flex flex-wrap gap-2.5">
            <Button onClick={startPracticeArena}>New Practice Slip</Button>
            {activeSession && (
              <Button variant="secondary" onClick={() => setPhase("lobby")}>
                Return to Live Cash Pool
              </Button>
            )}
            <Button variant="ghost" href="/dashboard">
              Overview
            </Button>
          </div>
        </div>
      );
    }

    const pq = VIRAL_DEMO_QUESTIONS[practiceStep];
    const progress = ((practiceStep + 1) / VIRAL_DEMO_QUESTIONS.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-5 animate-fade-in">
        {/* Progress & Millisecond Clock */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[#171A21] overflow-hidden">
            <div
              className="h-full bg-[#F7911B] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-xs text-[#8A92A6] tabular-nums">
            0{practiceStep + 1} / 0{VIRAL_DEMO_QUESTIONS.length}
          </span>
          <span className="rounded border border-[#222631] bg-[#111318] px-2.5 py-1 font-mono text-xs font-semibold text-[#10B981] tabular-nums">
            {(liveQuestionMs / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Question Slip */}
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222631] pb-3.5">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{pq.category}</Badge>
              <span className="font-mono text-[11px] text-[#8A92A6]">PRACTICE MARKET</span>
            </div>

            {practice2xUsedStep === null ? (
              <button
                type="button"
                disabled={!!practicePickedId}
                onClick={() => setPractice2xArmed((v) => !v)}
                className={`rounded border px-3 py-1 font-mono text-[11px] font-semibold transition-colors ${
                  practice2xArmed
                    ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                    : "border-[#2E3442] bg-[#171A21] text-[#C8CDD8] hover:border-[#F7911B]"
                }`}
              >
                {practice2xArmed ? "2X MULTIPLIER ARMED (MAX 20 PTS)" : "ARM 2X MULTIPLIER (1)"}
              </button>
            ) : (
              <span className="font-mono text-[11px] text-[#8A92A6]">
                {practice2xUsedStep === practiceStep ? "2X MULTIPLIER ACTIVE" : "2X MULTIPLIER USED"}
              </span>
            )}
          </div>

          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F4F5F8] leading-snug">
            {pq.title}
          </h2>

          <div className="space-y-2.5">
            {pq.options.map((opt, idx) => {
              const isPicked = practicePickedId === opt.id;
              const isTop = opt.rank === 1;
              const mult = practice2xUsedStep === practiceStep ? 2 : 1;
              const letter = String.fromCharCode(65 + idx);

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!practicePickedId}
                  onClick={() => handlePracticePick(opt.id)}
                  className={`w-full text-left relative overflow-hidden rounded-lg border p-3.5 transition-colors ${
                    practicePickedId
                      ? isPicked
                        ? "border-[#F7911B] bg-[#171A21]"
                        : "border-[#222631] bg-[#090A0D]/70 opacity-80"
                      : "border-[#222631] bg-[#171A21]/70 hover:border-[#2E3442] hover:bg-[#171A21]"
                  }`}
                >
                  {practicePickedId && (
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                        isTop ? "bg-[#F7911B]/15" : "bg-white/[0.03]"
                      }`}
                      style={{ width: `${opt.crowdPct}%` }}
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-7 place-items-center rounded border font-mono text-xs font-semibold shrink-0 ${
                          isPicked
                            ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                            : "border-[#2E3442] bg-[#090A0D] text-[#8A92A6]"
                        }`}
                      >
                        {isPicked ? <CheckIcon className="size-3.5" /> : letter}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-[#F4F5F8]">
                          {opt.label}
                        </span>
                        {practicePickedId && (
                          <p className="font-mono text-[11px] text-[#8A92A6] mt-0.5">
                            {isTop ? "RANK #1 CONSENSUS" : `RANK #${opt.rank}`} · +
                            {opt.points * (isPicked ? mult : 1)} PTS
                          </p>
                        )}
                      </div>
                    </div>
                    {practicePickedId && (
                      <span className="font-mono text-base font-semibold text-[#F4F5F8] tabular-nums">
                        {opt.crowdPct}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {practicePickedId && (
            <div className="pt-3.5 border-t border-[#222631] flex items-center justify-between">
              <span className="font-mono text-xs text-[#8A92A6] tabular-nums">
                RUNNING YIELD: <strong className="text-[#F4F5F8]">{practiceScore} PTS</strong>
              </span>
              <Button size="sm" onClick={handlePracticeNext}>
                {practiceStep < VIRAL_DEMO_QUESTIONS.length - 1 ? "Next Question →" : "Settle Slip →"}
              </Button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── No Active DB Session → Open Practice Market Card ──
  if (!activeSession) {
    return (
      <div className="mx-auto max-w-xl py-8 animate-fade-in">
        <div className="rounded-xl border border-[#222631] bg-[#111318] p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <Badge variant="active" dot>PRACTICE ARENA OPEN</Badge>
            <span className="font-mono text-xs text-[#8A92A6]">ZERO FEE</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
            Naija Consensus Practice Arena
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] leading-relaxed">
            Test your crowd read, 2x Multiplier timing, and cumulative response speed across 5 cultural questions while the next 72-hour cash session prepares to open.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button size="lg" onClick={startPracticeArena}>
              <PlayIcon className="size-4 fill-current" />
              <span>Start 5-Question Slip</span>
            </Button>
            <Button variant="secondary" size="lg" href="/sessions">
              View Pool Schedule
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby (Pre-Entry Ticket) ──
  if (phase === "lobby") {
    const notEnoughCoins = (wallet?.coin_balance ?? 0) < activeSession.entry_fee_coins;

    return (
      <div className="mx-auto max-w-lg space-y-5 animate-fade-in">
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#222631] pb-3.5">
            <Badge variant="active" dot>LIVE SESSION POOL</Badge>
            <span className="font-mono text-[11px] font-semibold text-[#F7911B]">
              1X MULTIPLIER INCLUDED
            </span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">{activeSession.name}</h1>
            <p className="mt-1 text-xs text-[#8A92A6]">
              Lock in your predictions across all session questions. Fastest consensus wins ties.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
            <div className="rounded-lg border border-[#222631] bg-[#090A0D] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Guaranteed Pool</p>
              <p className="mt-1 text-lg font-semibold text-[#10B981]">
                {formatNaira(activeSession.prize_pool)}
              </p>
            </div>
            <div className="rounded-lg border border-[#222631] bg-[#090A0D] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Entry Allocation</p>
              <p className="mt-1 text-lg font-semibold text-[#F4F5F8]">
                {activeSession.entry_fee_coins} GW
              </p>
            </div>
            <div className="rounded-lg border border-[#222631] bg-[#090A0D] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Closes In</p>
              <p className="mt-1 text-lg font-semibold text-[#F7911B]">{timerStr}</p>
            </div>
            <div className="rounded-lg border border-[#222631] bg-[#090A0D] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-[#8A92A6]">Available Balance</p>
              <p className="mt-1 text-lg font-semibold text-[#F4F5F8]">
                {(wallet?.coin_balance ?? 0).toLocaleString()} GW
              </p>
            </div>
          </div>

          {joinError && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#EF4444]">
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
              ? "Authorizing Entry..."
              : notEnoughCoins
                ? "Insufficient GW Coins"
                : `Confirm Entry — ${activeSession.entry_fee_coins} GW Coins`}
          </Button>

          {notEnoughCoins && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowTopup(true)}
            >
              Top Up via Airtime VAS (MTN / Airtel / Glo / 9mobile)
            </Button>
          )}

          <div className="pt-3 border-t border-[#222631] text-center">
            <button
              type="button"
              onClick={startPracticeArena}
              className="text-xs font-medium text-[#8A92A6] hover:text-[#F7911B]"
            >
              Warm up first in the Free 5-Question Practice Arena →
            </button>
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

  // ── Live Session Playing ──
  if (phase === "playing" && questions.length > 0) {
    const currentQ = questions[currentIndex];
    const q = currentQ.questions;
    const progress = (currentIndex / questions.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-5 animate-fade-in">
        {/* Telemetry Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[#171A21] overflow-hidden">
            <div
              className="h-full bg-[#F7911B] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-xs text-[#8A92A6] tabular-nums">
            {currentIndex + 1} / {questions.length}
          </span>
          <span className="rounded border border-[#222631] bg-[#111318] px-2.5 py-1 font-mono text-xs font-semibold text-[#10B981] tabular-nums">
            {(liveQuestionMs / 1000).toFixed(1)}s
          </span>
          <span className="font-mono text-xs text-[#8A92A6] hidden sm:flex items-center gap-1 tabular-nums">
            <TimerIcon className="size-3.5" /> {timerStr}
          </span>
        </div>

        {/* Question Slip */}
        <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222631] pb-3.5 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{q.category}</Badge>
              <span className="font-mono text-xs text-[#8A92A6]">MARKET #{currentIndex + 1}</span>
            </div>

            {!lockedQuestionId ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setArm2xLock((v) => !v)}
                className={`rounded border px-3 py-1 font-mono text-[11px] font-semibold transition-colors ${
                  arm2xLock
                    ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                    : "border-[#2E3442] bg-[#171A21] text-[#C8CDD8] hover:border-[#F7911B]"
                }`}
              >
                {arm2xLock ? "2X MULTIPLIER ARMED" : "ARM 2X MULTIPLIER (1)"}
              </button>
            ) : (
              <span className="font-mono text-[11px] text-[#8A92A6]">
                2X MULTIPLIER USED
              </span>
            )}
          </div>

          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F4F5F8] leading-snug">
            {q.title}
          </h2>
          <p className="mt-1 text-xs text-[#8A92A6]">
            Select the option you expect the majority of session entries to lock in:
          </p>

          <div className="mt-5 space-y-2.5">
            {q.question_options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isAnswered = !!answers[q.id];
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSubmitAnswer(opt.id)}
                  disabled={submitting || isAnswered}
                  className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                    isSelected
                      ? "border-[#F7911B] bg-[#171A21]"
                      : "border-[#222631] bg-[#171A21]/70 hover:border-[#2E3442] hover:bg-[#171A21]"
                  } ${submitting && !isSelected ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-7 place-items-center rounded border font-mono text-xs font-semibold ${
                          isSelected
                            ? "border-[#F7911B] bg-[#F7911B] text-[#090A0D]"
                            : "border-[#2E3442] bg-[#090A0D] text-[#8A92A6]"
                        }`}
                      >
                        {isSelected ? <CheckIcon className="size-3.5" /> : String.fromCharCode(65 + opt.position)}
                      </span>
                      <span className="text-sm font-medium text-[#F4F5F8]">
                        {opt.label}
                      </span>
                    </div>
                    {arm2xLock && !lockedQuestionId && (
                      <span className="rounded border border-[#F7911B]/30 bg-[#F7911B]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#F7911B]">
                        2X
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

  // ── Completed: Verification Receipt ──
  if (phase === "completed") {
    const answerValues = Object.values(answers);
    const answeredCount = answerValues.length || (questions.length > 0 ? questions.length : 10);
    const totalResponseMs = answerValues.reduce((sum, a) => sum + (a.responseMs || 2200), 0) || 21400;
    const totalSeconds = (totalResponseMs / 1000).toFixed(1);
    const featuredQuestion =
      questions[0]?.questions?.title ??
      "Which Nigerian meal will be chosen by the majority?";

    return (
      <div className="mx-auto max-w-xl space-y-5 animate-fade-in py-4">
        <div className="space-y-1">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#10B981]">
            ENTRY SEALED · TIEBREAKER TIME {totalSeconds}S
          </span>
          <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
            Predictions Locked In
          </h1>
          <p className="text-xs text-[#8A92A6]">
            Your picks are recorded in the session ledger. Challenge your group while the pool is open.
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

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Button onClick={startPracticeArena}>Practice Arena</Button>
          <Button variant="secondary" href="/leaderboard">
            Standings
          </Button>
          <Button variant="ghost" href="/dashboard">
            Overview
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
