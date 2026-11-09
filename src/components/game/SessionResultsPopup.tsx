"use client";

import { useEffect, useState, useRef, useCallback, useId } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  playSessionComplete,
  playRankClimb,
  playOptionSelect,
} from "@/lib/audio/sound-effects";

export type FeedbackOptionRow = {
  rank: number;
  optionId: string;
  label: string;
  mediaUrl: string | null;
  position: number;
  selectionCount: number;
  percentage: number;
  points: number;
  avgResponseMs: number;
  isMostSelected: boolean;
  isLeastSelected: boolean;
  isMyPick: boolean;
};

export type QuestionFeedbackItem = {
  position: number;
  questionId: string;
  title: string;
  category: string;
  type: string;
  notes: string | null;
  totalSelections: number;
  avgResponseMs: number;
  mySelectedOptionId: string | null;
  myResponseMs: number | null;
  myPointsEarned: number | null;
  options: FeedbackOptionRow[];
};

export type PopupLeaderboardRow = {
  rank: number;
  points: number;
  response_ms: number;
  prize: number;
  user_id: string;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type PopupSessionMeta = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  prize_pool: number;
  prize_structure?: { rank_from: number; rank_to: number; amount: number }[];
};

export type PopupSummary = {
  totalPlays: number;
  uniquePlayers: number;
  totalGuesses: number;
  avgQuestionMs: number;
  prizePool: number;
  totalWinners: number;
};

export type MyPerformanceSummary = {
  rank: number | null;
  points: number;
  responseMs: number;
  prize: number;
  mostSelectedHits: number;
  top3Hits: number;
  questionsAnswered: number;
};

export type OpenSessionResultsDetail = {
  sessionId?: string;
  entryId?: string;
  initialTab?: "feedback" | "winners" | "mypicks";
};

export function openSessionResultsPopup(detail: OpenSessionResultsDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenSessionResultsDetail>("gw-open-session-results", {
      detail,
    }),
  );
}

let cachedSupportsDisplayTransition: boolean | undefined;
function canTransitionDisplay(): boolean {
  if (cachedSupportsDisplayTransition !== undefined) {
    return cachedSupportsDisplayTransition;
  }
  if (
    typeof window === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = "none";
  cachedSupportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.CSS?.supports?.("overlay", "auto")) &&
    canTransitionDisplay()
  );
}

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatResponseSec(ms: number): string {
  if (!ms || ms <= 0) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTotalClock(ms: number): string {
  if (!ms || ms <= 0) return "0:00";
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useAnimatedNumber(target: number, durationMs = 650): number {
  const [val, setVal] = useState(target);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVal(target);
      return;
    }
    let raf = 0;
    const startVal = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return val;
}

const CONFETTI_PIECES = [
  { left: "6%", delay: "0s", color: "#10b981" },
  { left: "14%", delay: "0.35s", color: "#f7911b" },
  { left: "23%", delay: "0.7s", color: "#38bdf8" },
  { left: "34%", delay: "0.15s", color: "#f43f5e" },
  { left: "46%", delay: "0.55s", color: "#eab308" },
  { left: "58%", delay: "0.25s", color: "#a855f7" },
  { left: "69%", delay: "0.8s", color: "#10b981" },
  { left: "79%", delay: "0.4s", color: "#f7911b" },
  { left: "88%", delay: "0.65s", color: "#38bdf8" },
  { left: "94%", delay: "0.2s", color: "#eab308" },
];

export function SessionResultsPopup() {
  const { user } = useAuth();
  const titleId = useId();
  const feedbackTableCaptionId = useId();
  const winnersTableCaptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"feedback" | "winners" | "mypicks">(
    "feedback",
  );

  const [sessions, setSessions] = useState<PopupSessionMeta[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [currentEntryId, setCurrentEntryId] = useState<string>("");
  const [sessionMeta, setSessionMeta] = useState<PopupSessionMeta | null>(null);
  const [summary, setSummary] = useState<PopupSummary | null>(null);
  const [myPerformance, setMyPerformance] =
    useState<MyPerformanceSummary | null>(null);
  const [questionFeedbacks, setQuestionFeedbacks] = useState<
    QuestionFeedbackItem[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<PopupLeaderboardRow[]>([]);

  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [autoCycleQuestions, setAutoCycleQuestions] = useState(false);
  const [winnerSearch, setWinnerSearch] = useState("");
  const [barAnimKey, setBarAnimKey] = useState(0);

  // Track known active session status so if a session transitions from active -> completed, we auto-open!
  const knownSessionStatusRef = useRef<Map<string, string>>(new Map());

  const animatedGuesses = useAnimatedNumber(summary?.totalGuesses ?? 0);
  const animatedPrizePool = useAnimatedNumber(
    summary?.prizePool ?? sessionMeta?.prize_pool ?? 500000,
  );
  const animatedMyScore = useAnimatedNumber(myPerformance?.points ?? 0);

  const closeTopLayer = useCallback(async () => {
    const dialog = dialogRef.current;
    setAutoCycleQuestions(false);
    setIsOpen(false);
    if (!dialog || !dialog.open) {
      return;
    }
    dialog.removeAttribute("data-closing");
    dialog.close();
  }, []);

  const fetchSessionFeedback = useCallback(
    async (targetSessionId?: string, entryIdOverride?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (targetSessionId) {
          params.set("sessionId", targetSessionId);
        } else {
          params.set("preferCompleted", "1");
        }
        params.set("includeFeedback", "1");
        if (user?.id) params.set("userId", user.id);
        if (entryIdOverride) params.set("entryId", entryIdOverride);

        const res = await fetch(`/api/game/session?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();

        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions as PopupSessionMeta[]);
        }
        if (data.session) {
          setSessionMeta(data.session as PopupSessionMeta);
          setSelectedSessionId(data.session.id);
        }
        if (data.summary) {
          setSummary(data.summary as PopupSummary);
        }
        setMyPerformance((data.myPerformance as MyPerformanceSummary) ?? null);
        setQuestionFeedbacks(
          Array.isArray(data.questionFeedbacks)
            ? (data.questionFeedbacks as QuestionFeedbackItem[])
            : [],
        );
        setLeaderboard(
          Array.isArray(data.leaderboard)
            ? (data.leaderboard as PopupLeaderboardRow[])
            : [],
        );
        setSelectedQuestionIdx(0);
        setBarAnimKey((k) => k + 1);
      } catch (err) {
        console.error("Failed to load session feedback:", err);
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  const openModalWithSession = useCallback(
    async (detail: OpenSessionResultsDetail = {}) => {
      const dialog = dialogRef.current;
      if (detail.initialTab) {
        setActiveTab(detail.initialTab);
      } else {
        setActiveTab("feedback");
      }
      if (detail.entryId) {
        setCurrentEntryId(detail.entryId);
      }

      setIsOpen(true);
      if (dialog && !dialog.open) {
        dialog.removeAttribute("data-closing");
        dialog.showModal();
      }

      playSessionComplete();
      await fetchSessionFeedback(detail.sessionId, detail.entryId);
    },
    [fetchSessionFeedback],
  );

  // Listen for custom open events anywhere in the app
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const custom = e as CustomEvent<OpenSessionResultsDetail>;
      void openModalWithSession(custom.detail ?? {});
    };
    window.addEventListener("gw-open-session-results", handleOpenEvent);
    return () =>
      window.removeEventListener("gw-open-session-results", handleOpenEvent);
  }, [openModalWithSession]);

  // Native <dialog> cancel & light-dismiss fallback (per modern-web-guidance `dialog` & `animate-to-from-top-layer`)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = (event: Event) => {
      event.preventDefault();
      void closeTopLayer();
    };

    const onClose = () => {
      dialog.returnValue = "";
      setIsOpen(false);
      setAutoCycleQuestions(false);
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);

    // Light-dismiss fallback for browsers without native `closedBy` (e.g., Safari)
    let cleanupOutside: (() => void) | undefined;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      const outside = (e: PointerEvent, d: HTMLDialogElement) => {
        const r = d.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = outside(e, dialog);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e, dialog)) {
          void closeTopLayer();
        }
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupOutside = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
      cleanupOutside?.();
    };
  }, [closeTopLayer]);

  // Monitor sessions for automatic popup when an active session ends (status transitions to "completed")
  useEffect(() => {
    let mounted = true;

    const checkSessionEnd = async () => {
      try {
        const res = await fetch("/api/game/session", {
          cache: "no-store",
          priority: "low",
        });
        if (!res.ok || !mounted) return;
        const data = await res.json();
        const list = (data.sessions ?? []) as PopupSessionMeta[];
        if (list.length === 0) return;

        const now = Date.now();
        for (const s of list) {
          const prevStatus = knownSessionStatusRef.current.get(s.id);
          const effectiveStatus =
            s.status === "completed" || new Date(s.ends_at).getTime() <= now
              ? "completed"
              : s.status;
          knownSessionStatusRef.current.set(s.id, effectiveStatus);

          // 1) If a session just transitioned from active/closing -> completed while the user is online:
          if (
            prevStatus &&
            prevStatus !== "completed" &&
            effectiveStatus === "completed"
          ) {
            if (typeof window !== "undefined") {
              localStorage.setItem(`gw_popup_shown_${s.id}`, "1");
            }
            void openModalWithSession({
              sessionId: s.id,
              initialTab: "feedback",
            });
            return;
          }

          // 2) If a session ended recently (within the last 12 hours) and the user hasn't seen its end popup yet:
          const endedAgoMs = now - new Date(s.ends_at).getTime();
          if (
            effectiveStatus === "completed" &&
            endedAgoMs >= 0 &&
            endedAgoMs <= 12 * 3600_000 &&
            typeof window !== "undefined" &&
            !localStorage.getItem(`gw_popup_shown_${s.id}`)
          ) {
            localStorage.setItem(`gw_popup_shown_${s.id}`, "1");
            void openModalWithSession({
              sessionId: s.id,
              initialTab: "feedback",
            });
            return;
          }
        }
      } catch {
        // Ignore transient network errors
      }
    };

    void checkSessionEnd();
    const interval = setInterval(() => {
      void checkSessionEnd();
    }, 8000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [openModalWithSession]);

  // Auto-cycle through Q1..Q10 when enabled
  useEffect(() => {
    if (!isOpen || !autoCycleQuestions || questionFeedbacks.length <= 1) return;
    const timer = setInterval(() => {
      setSelectedQuestionIdx((prev) => (prev + 1) % questionFeedbacks.length);
      setBarAnimKey((k) => k + 1);
      playOptionSelect();
    }, 3800);
    return () => clearInterval(timer);
  }, [isOpen, autoCycleQuestions, questionFeedbacks.length]);

  const isSessionEnded =
    !sessionMeta ||
    sessionMeta.status === "completed" ||
    new Date(sessionMeta.ends_at).getTime() <= Date.now();
  const completedSessionOption = sessions.find(
    (s) => s.status === "completed" || new Date(s.ends_at).getTime() <= Date.now(),
  );
  const currentQuestion =
    questionFeedbacks[selectedQuestionIdx] ?? questionFeedbacks[0] ?? null;

  const top3Winners = leaderboard.slice(0, 3);
  const filteredLeaderboard = leaderboard.filter((r) => {
    if (!winnerSearch.trim()) return true;
    const uname = (r.profiles?.username ?? "Player").toLowerCase();
    return uname.includes(winnerSearch.trim().toLowerCase());
  });

  const handleSelectSessionInModal = async (nextSessionId: string) => {
    setSelectedSessionId(nextSessionId);
    setAutoCycleQuestions(false);
    await fetchSessionFeedback(nextSessionId, currentEntryId);
  };

  const handleSelectQuestionIdx = (idx: number) => {
    setSelectedQuestionIdx(idx);
    setBarAnimKey((k) => k + 1);
    playOptionSelect();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      className="gw-session-results-dialog m-auto w-[min(96vw,1080px)] max-h-[92dvh] rounded-3xl border border-white/15 bg-[#090d16] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.85)] p-0 overflow-hidden"
    >
      {/* ── Top Animated Celebration Header ── */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#141c2f] via-[#0d1220] to-[#1a1118] px-5 py-5 sm:px-8 sm:py-6 shrink-0">
        {/* Confetti Particle Layer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={idx}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color,
              }}
              className="animate-gw-confetti absolute top-0 size-2 rounded-sm opacity-0"
            />
          ))}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute -bottom-20 right-10 h-40 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          {/* Top Row: Badge + Session Switcher + Close Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm ${
                  isSessionEnded
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                    : "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    isSessionEnded
                      ? "bg-amber-400"
                      : "bg-emerald-400 animate-pulse"
                  }`}
                />
                <span>
                  {isSessionEnded
                    ? "🏁 Session Ended · Official Results & Winners"
                    : "🟢 Session Ongoing · In Progress (Not Ended Yet)"}
                </span>
              </span>

              {sessions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor="popup-session-select" className="sr-only">
                    Switch Session
                  </label>
                  <select
                    id="popup-session-select"
                    value={selectedSessionId}
                    onChange={(e) =>
                      void handleSelectSessionInModal(e.target.value)
                    }
                    className="rounded-xl border border-white/15 bg-[#07090e]/90 px-3 py-1.5 text-xs font-semibold text-white focus:border-accent focus:outline-none"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (
                        {s.status === "completed"
                          ? "🏁 ENDED · Final Results"
                          : "🟢 ONGOING · Live Session"}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void closeTopLayer()}
              aria-label="Close session results popup"
              autoFocus
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            >
              <span>✕ Close</span>
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight flex flex-wrap items-center gap-2.5"
              >
                <span>🏆 {sessionMeta?.name ?? "Session Results & Crowd Feedback"}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Full crowd selection percentages, assigned option points (10–1), response speeds, and top session winners.
              </p>
            </div>

            {/* Animated KPI Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  Prize Pool
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-amber-300 tabular-nums">
                  ₦{animatedPrizePool.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
                  Crowd Guesses
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-emerald-300 tabular-nums">
                  {animatedGuesses.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300/80">
                  Players · Speed
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-sky-300 tabular-nums">
                  {summary?.uniquePlayers ?? leaderboard.length} ·{" "}
                  {formatResponseSec(summary?.avgQuestionMs ?? 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-accent/40 bg-accent/15 px-3.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Your Best Score
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-white tabular-nums">
                  {myPerformance?.rank
                    ? `${formatOrdinal(myPerformance.rank)} · ${animatedMyScore} pts`
                    : `${animatedMyScore} pts`}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs inside Popup */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div
              role="tablist"
              aria-label="Session results sections"
              className="inline-flex flex-wrap rounded-2xl border border-white/10 bg-[#07090e]/80 p-1 gap-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "feedback"}
                onClick={() => {
                  setActiveTab("feedback");
                  setBarAnimKey((k) => k + 1);
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "feedback"
                    ? "bg-accent text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📊 Crowd Feedback ({questionFeedbacks.length} Questions)
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "winners"}
                onClick={() => {
                  setActiveTab("winners");
                  playRankClimb();
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "winners"
                    ? "bg-accent text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {isSessionEnded
                  ? `🏆 Official Winners & Podium (${leaderboard.length})`
                  : `⏳ Live Provisional Standings (${leaderboard.length})`}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "mypicks"}
                onClick={() => setActiveTab("mypicks")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "mypicks"
                    ? "bg-accent text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎯 My Picks
                {isSessionEnded &&
                myPerformance &&
                myPerformance.questionsAnswered > 0
                  ? ` (${myPerformance.mostSelectedHits}/10 #1 Hits)`
                  : ""}
              </button>
            </div>

            {myPerformance && myPerformance.prize > 0 && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-bold text-emerald-300">
                <span>
                  {isSessionEnded
                    ? "🎉 Official Winner! Prize Won:"
                    : "⏳ In Winning Zone! Projected Prize:"}
                </span>
                <span className="font-mono text-sm text-white">
                  ₦{myPerformance.prize.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Modal Body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="size-9 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs font-medium text-slate-400">
              Calculating crowd consensus &amp; session winners...
            </p>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════════════
                ONGOING SESSION FAIR-PLAY NOTICE BANNER (when status !== "completed")
               ════════════════════════════════════════════════════════════════ */}
            {!isSessionEnded && (
              <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                      🟢 Live Session Ongoing — Fair-Play Crowd Lock Active
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <strong>{sessionMeta?.name}</strong> is still in progress! To keep competition fair while players can still play and improve their Best Score, crowd vote percentages and{" "}
                    <span className="text-emerald-300 font-semibold">
                      #1 MOST SELECTED (10 pts)
                    </span>{" "}
                    answers are sealed until the session timer ends.
                  </p>
                </div>

                {completedSessionOption && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleSelectSessionInModal(completedSessionOption.id)
                    }
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-200 transition-colors"
                  >
                    <span>🏁 View Ended Session ({completedSessionOption.name})</span>
                  </button>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 1: CROWD FEEDBACK RESULTS (Question-by-Question 10–1 Table)
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === "feedback" && (
              <div className="space-y-5 animate-fade-in">
                {/* Question Switcher Pills (Q1 - Q10) + Auto-Play Story Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111c] p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {questionFeedbacks.map((qf, idx) => {
                      const isCurrent = idx === selectedQuestionIdx;
                      const earned = isSessionEnded ? qf.myPointsEarned : null;
                      return (
                        <button
                          key={qf.questionId}
                          type="button"
                          onClick={() => handleSelectQuestionIdx(idx)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                            isCurrent
                              ? "border-accent bg-accent text-white shadow-sm scale-105"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white"
                          }`}
                        >
                          <span>Q{qf.position}</span>
                          {earned !== null && (
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono ${
                                isCurrent
                                  ? "bg-black/30 text-amber-200"
                                  : earned === 10
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-white/10 text-slate-300"
                              }`}
                            >
                              +{earned}p
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectQuestionIdx(
                          (selectedQuestionIdx - 1 + questionFeedbacks.length) %
                            Math.max(1, questionFeedbacks.length),
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-slate-200"
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectQuestionIdx(
                          (selectedQuestionIdx + 1) %
                            Math.max(1, questionFeedbacks.length),
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-slate-200"
                    >
                      Next →
                    </button>
                    {isSessionEnded && (
                      <button
                        type="button"
                        aria-pressed={autoCycleQuestions}
                        onClick={() => setAutoCycleQuestions((v) => !v)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                          autoCycleQuestions
                            ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
                        }`}
                      >
                        {autoCycleQuestions ? "⏸ Pause Auto" : "▶ Auto-Play Q1–Q10"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Question Feedback Breakdown Card */}
                {currentQuestion ? (
                  <div
                    key={`${currentQuestion.questionId}-${barAnimKey}`}
                    className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden animate-fade-in"
                  >
                    {/* Question Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-accent/20 border border-accent/40 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                            Question #{currentQuestion.position}
                          </span>
                          <span className="rounded-lg bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                            {currentQuestion.category}
                          </span>
                          <span className="text-xs text-slate-400">
                            {currentQuestion.totalSelections.toLocaleString()}{" "}
                            selections · Avg{" "}
                            {formatResponseSec(currentQuestion.avgResponseMs)}
                          </span>
                        </div>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                          {currentQuestion.title}
                        </h3>
                      </div>

                      {isSessionEnded && currentQuestion.myPointsEarned !== null ? (
                        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3.5 py-2 text-right shrink-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Your Score on Q{currentQuestion.position}
                          </p>
                          <p className="font-mono text-sm font-bold text-white">
                            +{currentQuestion.myPointsEarned} pts{" "}
                            <span className="text-xs text-slate-300">
                              ({formatResponseSec(currentQuestion.myResponseMs ?? 0)})
                            </span>
                          </p>
                        </div>
                      ) : !isSessionEnded ? (
                        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3.5 py-2 text-right shrink-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            Crowd Breakdown Status
                          </p>
                          <p className="font-mono text-xs font-bold text-white">
                            🔒 Unlocks when session ends
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* 10 Options Ranked Table (Revealed for Ended Sessions, Sealed for Ongoing Sessions) */}
                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby={feedbackTableCaptionId}
                      className="overflow-x-auto"
                    >
                      <table className="w-full text-sm border-collapse">
                        <caption id={feedbackTableCaptionId} className="sr-only">
                          Crowd selection feedback and points for{" "}
                          {currentQuestion.title}
                        </caption>
                        <thead>
                          <tr className="border-b border-white/10 bg-[#090c14] text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="py-3 pl-5 pr-3 w-14">
                              {isSessionEnded ? "Rank" : "Option #"}
                            </th>
                            <th className="py-3 px-3">Option</th>
                            <th className="py-3 px-3 text-right w-20">Votes</th>
                            <th className="py-3 px-4 w-64">Crowd Share</th>
                            <th className="py-3 px-3 text-center w-24">Points</th>
                            <th className="py-3 px-3 text-right w-20">Avg Time</th>
                            <th className="py-3 pl-3 pr-5 text-right w-36">
                              Crowd Rank
                            </th>
                          </tr>
                        </thead>
                        <tbody className="stagger">
                          {(isSessionEnded
                            ? currentQuestion.options
                            : [...currentQuestion.options].sort(
                                (a, b) => a.position - b.position,
                              )
                          ).map((opt, idx) => {
                            const hasImage =
                              opt.mediaUrl &&
                              (opt.mediaUrl.startsWith("http") ||
                                opt.mediaUrl.startsWith("data:image/"));
                            const hasColor =
                              opt.mediaUrl && opt.mediaUrl.startsWith("#");

                            const barColor = opt.isMostSelected
                              ? "bg-emerald-400"
                              : opt.isLeastSelected
                              ? "bg-rose-500"
                              : "bg-amber-400";

                            const pointsBadgeClass =
                              opt.points === 10
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                : opt.points === 1
                                ? "border-rose-500/40 bg-rose-500/20 text-rose-300"
                                : "border-amber-500/35 bg-amber-500/15 text-amber-300";

                            return (
                              <tr
                                key={opt.optionId}
                                className={`border-b border-white/5 last:border-0 transition-colors ${
                                  isSessionEnded && opt.isMostSelected
                                    ? "bg-emerald-500/[0.07]"
                                    : opt.isMyPick
                                    ? "bg-accent/[0.08]"
                                    : "hover:bg-white/[0.02]"
                                }`}
                              >
                                <td className="py-3 pl-5 pr-3 font-mono text-xs font-semibold text-slate-400">
                                  #{isSessionEnded ? opt.rank : idx + 1}
                                </td>

                                <th
                                  scope="row"
                                  className="py-3 px-3 font-semibold text-white text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    {hasImage && opt.mediaUrl ? (
                                      <img
                                        src={opt.mediaUrl}
                                        alt={opt.label}
                                        width={56}
                                        height={40}
                                        className="h-10 w-14 rounded-lg object-cover border border-white/15 bg-slate-900 shrink-0 shadow-sm"
                                      />
                                    ) : hasColor && opt.mediaUrl ? (
                                      <span
                                        className="size-8 rounded-full border-2 border-white/80 shrink-0 shadow-sm"
                                        style={{ backgroundColor: opt.mediaUrl }}
                                      />
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm sm:text-base font-bold text-white">
                                        {opt.label}
                                      </span>
                                      {opt.isMyPick && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent">
                                          ★ Your Pick
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </th>

                                <td className="py-3 px-3 text-right font-mono text-sm font-bold text-white tabular-nums">
                                  {isSessionEnded ? opt.selectionCount : "🔒"}
                                </td>

                                <td className="py-3 px-4">
                                  {isSessionEnded ? (
                                    <div className="flex items-center gap-3">
                                      <div className="h-2.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                                        <div
                                          className={`h-full rounded-full animate-gw-bar ${barColor}`}
                                          style={{
                                            width: `${Math.max(
                                              opt.percentage,
                                              opt.selectionCount > 0 ? 4 : 2,
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="w-12 text-right font-mono text-xs font-bold text-slate-200 tabular-nums">
                                        {opt.percentage}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-500 italic">
                                      Sealed while session is ongoing
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-center">
                                  {isSessionEnded ? (
                                    <span
                                      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${pointsBadgeClass}`}
                                    >
                                      {opt.points} {opt.points === 1 ? "pt" : "pts"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-slate-400">
                                      10–1 pts
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-sky-400 tabular-nums">
                                  {isSessionEnded
                                    ? formatResponseSec(opt.avgResponseMs)
                                    : "—"}
                                </td>

                                <td className="py-3 pl-3 pr-5 text-right">
                                  {!isSessionEnded ? (
                                    <span className="font-mono text-xs text-slate-500">
                                      🔒 Live
                                    </span>
                                  ) : opt.isMostSelected ? (
                                    <span className="inline-flex items-center rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                                      MOST SELECTED
                                    </span>
                                  ) : opt.isLeastSelected ? (
                                    <span className="inline-flex items-center rounded-md bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-300">
                                      LEAST SELECTED
                                    </span>
                                  ) : (
                                    <span className="font-mono text-xs text-slate-400">
                                      Rank #{opt.rank}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-10 text-center text-sm text-slate-400">
                    No question feedback available for this session yet.
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 2: WINNERS & ANIMATED TOP 3 PODIUM
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === "winners" && (
              <div className="space-y-6 animate-fade-in">
                {/* Animated Top 3 Podium Cards */}
                {top3Winners.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
                    {/* 2nd Place */}
                    {top3Winners[1] && (
                      <div
                        style={{ animationDelay: "120ms" }}
                        className="animate-gw-podium order-2 sm:order-1 rounded-2xl border border-slate-400/30 bg-gradient-to-b from-slate-400/15 to-[#0d111c] p-5 text-center space-y-2"
                      >
                        <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-300/20 border border-slate-300/40 text-2xl">
                          🥈
                        </div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
                          {isSessionEnded
                            ? "2nd Place Winner"
                            : "Current #2 (Provisional)"}
                        </p>
                        <p className="font-display text-lg font-bold text-white truncate">
                          {top3Winners[1].profiles?.username ?? "Player"}
                        </p>
                        <p className="font-display text-xl font-extrabold text-emerald-300 tabular-nums">
                          ₦{Number(top3Winners[1].prize || 50000).toLocaleString()}
                        </p>
                        <p className="font-mono text-xs text-slate-300">
                          {top3Winners[1].points} pts ·{" "}
                          {formatTotalClock(top3Winners[1].response_ms)}
                        </p>
                      </div>
                    )}

                    {/* 1st Place Champion */}
                    {top3Winners[0] && (
                      <div
                        style={{ animationDelay: "0ms" }}
                        className="animate-gw-podium order-1 sm:order-2 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-500/25 via-amber-500/10 to-[#0d111c] p-6 text-center space-y-2.5 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                      >
                        <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-400/25 border-2 border-amber-300 text-3xl">
                          👑
                        </div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                          {isSessionEnded
                            ? "1st Place Champion"
                            : "Current #1 Leader (Provisional)"}
                        </p>
                        <p className="font-display text-xl font-bold text-white truncate">
                          {top3Winners[0].profiles?.username ?? "Player"}
                        </p>
                        <p className="font-display text-2xl font-extrabold text-amber-300 tabular-nums">
                          ₦{Number(top3Winners[0].prize || 100000).toLocaleString()}
                        </p>
                        <p className="font-mono text-xs text-amber-100/90">
                          {top3Winners[0].points} pts ·{" "}
                          {formatTotalClock(top3Winners[0].response_ms)}
                        </p>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {top3Winners[2] && (
                      <div
                        style={{ animationDelay: "220ms" }}
                        className="animate-gw-podium order-3 rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-700/20 to-[#0d111c] p-5 text-center space-y-2"
                      >
                        <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-700/25 border border-amber-600/40 text-2xl">
                          🥉
                        </div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                          {isSessionEnded
                            ? "3rd Place Winner"
                            : "Current #3 (Provisional)"}
                        </p>
                        <p className="font-display text-lg font-bold text-white truncate">
                          {top3Winners[2].profiles?.username ?? "Player"}
                        </p>
                        <p className="font-display text-xl font-extrabold text-emerald-300 tabular-nums">
                          ₦{Number(top3Winners[2].prize || 20000).toLocaleString()}
                        </p>
                        <p className="font-mono text-xs text-slate-300">
                          {top3Winners[2].points} pts ·{" "}
                          {formatTotalClock(top3Winners[2].response_ms)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Winners & Leaderboard Table */}
                <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-white">
                        {isSessionEnded
                          ? "Official Session Winners & Final Standings"
                          : "Live Provisional Standings (Session Still Ongoing)"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Ranked by highest crowd-consensus points, then shortest cumulative response time.
                      </p>
                    </div>
                    <div className="w-full sm:w-60">
                      <label htmlFor="popup-winner-search" className="sr-only">
                        Search winners
                      </label>
                      <input
                        id="popup-winner-search"
                        type="search"
                        value={winnerSearch}
                        onChange={(e) => setWinnerSearch(e.target.value)}
                        placeholder="Search player..."
                        className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={winnersTableCaptionId}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-sm">
                      <caption id={winnersTableCaptionId} className="sr-only">
                        Session winners and rankings
                      </caption>
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                          <th className="py-2.5 pr-4">Position</th>
                          <th className="py-2.5 pr-4">
                            {isSessionEnded
                              ? "Official Prize (₦)"
                              : "Projected Prize (₦)"}
                          </th>
                          <th className="py-2.5 pr-4">Player</th>
                          <th className="py-2.5 pr-4">Points</th>
                          <th className="py-2.5 text-right">Total Time</th>
                        </tr>
                      </thead>
                      <tbody className="stagger">
                        {filteredLeaderboard.map((row) => {
                          const isMe = row.user_id === user?.id;
                          return (
                            <tr
                              key={row.user_id}
                              className={`border-b border-white/5 last:border-0 ${
                                isMe
                                  ? "bg-accent/10 text-accent font-semibold"
                                  : row.rank <= 3
                                  ? "text-amber-200 font-medium"
                                  : "text-slate-200"
                              }`}
                            >
                              <th
                                scope="row"
                                className="py-3 pr-4 font-display font-bold text-left"
                              >
                                {row.rank === 1
                                  ? "🥇 1st"
                                  : row.rank === 2
                                  ? "🥈 2nd"
                                  : row.rank === 3
                                  ? "🥉 3rd"
                                  : formatOrdinal(row.rank)}
                              </th>
                              <td className="py-3 pr-4 font-mono text-emerald-300 font-semibold tabular-nums">
                                {row.prize > 0
                                  ? `₦${row.prize.toLocaleString()}`
                                  : "—"}
                              </td>
                              <td className="py-3 pr-4">
                                {row.profiles?.username ?? "Player"}
                                {isMe ? " (You)" : ""}
                              </td>
                              <td className="py-3 pr-4 font-mono font-bold tabular-nums">
                                {row.points} pts
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-slate-300">
                                {formatTotalClock(row.response_ms)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 3: MY PICKS VS. CROWD #1 SCORECARD
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === "mypicks" && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 stagger">
                  {questionFeedbacks.map((qf) => {
                    const topOpt = qf.options[0];
                    const myOpt = qf.options.find((o) => o.isMyPick);
                    const matchedTop =
                      isSessionEnded &&
                      myOpt &&
                      topOpt &&
                      myOpt.optionId === topOpt.optionId;

                    return (
                      <div
                        key={qf.questionId}
                        onClick={() => {
                          setSelectedQuestionIdx(qf.position - 1);
                          setActiveTab("feedback");
                          setBarAnimKey((k) => k + 1);
                        }}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all hover:border-accent/50 ${
                          matchedTop
                            ? "border-emerald-500/35 bg-emerald-500/[0.06]"
                            : "border-white/10 bg-[#0d111c]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-400">
                            Q{qf.position} · {qf.category}
                          </span>
                          {isSessionEnded && qf.myPointsEarned !== null ? (
                            <span
                              className={`rounded-lg px-2.5 py-0.5 font-mono text-xs font-bold ${
                                qf.myPointsEarned === 10
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              +{qf.myPointsEarned} pts
                              {matchedTop ? " · 🎯 #1 Match!" : ""}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Click to inspect →
                            </span>
                          )}
                        </div>

                        <p className="font-display text-sm font-bold text-white mb-3">
                          {qf.title}
                        </p>

                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5">
                            <p className="text-[10px] font-bold uppercase text-emerald-300">
                              Crowd #1 (10 pts)
                            </p>
                            {isSessionEnded ? (
                              <>
                                <p className="font-bold text-white mt-0.5 truncate">
                                  {topOpt?.label ?? "—"}
                                </p>
                                <p className="font-mono text-[11px] text-emerald-200/80">
                                  {topOpt
                                    ? `${topOpt.selectionCount} votes (${topOpt.percentage}%)`
                                    : ""}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-amber-200 mt-0.5 truncate">
                                  🔒 Sealed (Session Live)
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Revealed when timer ends
                                </p>
                              </>
                            )}
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Your Selection
                            </p>
                            <p className="font-bold text-white mt-0.5 truncate">
                              {myOpt ? myOpt.label : "Not played"}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {myOpt
                                ? isSessionEnded
                                  ? `Rank #${myOpt.rank} · ${formatResponseSec(
                                      qf.myResponseMs ?? 0,
                                    )}`
                                  : `Locked in · ${formatResponseSec(
                                      qf.myResponseMs ?? 0,
                                    )}`
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0b0f19] px-5 py-3.5 sm:px-8 shrink-0">
        <p className="text-xs text-slate-400">
          💡 Tip: Click any question tab (`Q1`–`Q10`) or press{" "}
          <strong className="text-slate-200">▶ Auto-Play Q1–Q10</strong> to watch
          the crowd feedback breakdown animate question by question.
        </p>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void closeTopLayer()}
            className="rounded-xl bg-accent hover:bg-accent-hover px-5 py-2 text-xs font-bold text-white shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
