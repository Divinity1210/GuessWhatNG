"use client";

import { useEffect, useState, useRef, useCallback, useId } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAuthHeaders } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import {
  playSessionComplete,
  playRankClimb,
  playOptionSelect,
} from "@/lib/audio/sound-effects";
import {
  BarChartIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CrownIcon,
  LockIcon,
  PlayIcon,
  TargetIcon,
  TrophyIcon,
} from "@/components/ui/Icons";

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
  profiles?:
    | {
        username?: string | null;
        avatar_url?: string | null;
      }
    | {
        username?: string | null;
        avatar_url?: string | null;
      }[]
    | null;
};

function extractProfile(
  profiles: PopupLeaderboardRow["profiles"],
): { username?: string | null; avatar_url?: string | null } | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

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

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatResponseSec(ms: number): string {
  if (!ms || ms <= 0) return "-";
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
  { left: "8%", delay: "0s", color: "#10b981" },
  { left: "19%", delay: "0.35s", color: "#f7911b" },
  { left: "32%", delay: "0.7s", color: "#ff5a1f" },
  { left: "46%", delay: "0.15s", color: "#eab308" },
  { left: "61%", delay: "0.55s", color: "#10b981" },
  { left: "76%", delay: "0.25s", color: "#f7911b" },
  { left: "89%", delay: "0.65s", color: "#eab308" },
];

export function SessionResultsPopup() {
  const { user, profile } = useAuth();
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

        const headers = await getAuthHeaders();
        const res = await fetch(`/api/game/session?${params.toString()}`, {
          headers,
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

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const custom = e as CustomEvent<OpenSessionResultsDetail>;
      void openModalWithSession(custom.detail ?? {});
    };
    window.addEventListener("gw-open-session-results", handleOpenEvent);
    return () =>
      window.removeEventListener("gw-open-session-results", handleOpenEvent);
  }, [openModalWithSession]);

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

  const getPlayerDisplay = (row: PopupLeaderboardRow) => {
    const isMe = Boolean(user?.id && row.user_id === user.id);
    const prof = extractProfile(row.profiles);
    const name =
      prof?.username || (isMe ? profile?.username : null) || "Player";
    const avatarUrl =
      prof?.avatar_url || (isMe ? profile?.avatar_url : null) || null;
    return { name, avatarUrl, isMe };
  };

  const top3Winners = leaderboard.slice(0, 3);
  const filteredLeaderboard = leaderboard.filter((r) => {
    if (!winnerSearch.trim()) return true;
    const { name } = getPlayerDisplay(r);
    return name.toLowerCase().includes(winnerSearch.trim().toLowerCase());
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
      className="gw-session-results-dialog mt-auto mb-0 mx-0 sm:m-auto w-full max-w-full sm:w-[min(95vw,1040px)] max-h-[92dvh] rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#090d16] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.85)] p-0 overflow-hidden"
    >
      {/* Slim Top Bar (Only Title + Close Button Stay Pinned) */}
      <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0d1220] px-4 py-2.5 sm:px-6 sm:py-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`size-2 shrink-0 rounded-full ${
              isSessionEnded ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          <h2
            id={titleId}
            className="font-display text-base sm:text-lg font-bold text-white tracking-tight truncate"
          >
            {sessionMeta?.name ?? "Session Results"}
          </h2>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              isSessionEnded
                ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {isSessionEnded ? "Results" : "Live"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => void closeTopLayer()}
          aria-label="Close session results"
          autoFocus
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
        >
          <CloseIcon className="size-4.5" />
        </button>
      </div>

      {/* Unified Scrollable Body (Overview Controls + Tabs + Details All Scroll Smoothly) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-7 sm:py-5 space-y-4">
        {/* Scrolling Overview Block */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#131b2e] via-[#0d1220] to-[#171018] p-3.5 sm:p-4 space-y-3">
          {isSessionEnded && (
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
            </div>
          )}

          <div className="relative z-10 space-y-3">
            {(sessions.length > 1 || (myPerformance && myPerformance.prize > 0)) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {sessions.length > 1 ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label
                      htmlFor="popup-session-select"
                      className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0"
                    >
                      Session
                    </label>
                    <select
                      id="popup-session-select"
                      value={selectedSessionId}
                      onChange={(e) => void handleSelectSessionInModal(e.target.value)}
                      className="min-h-10 flex-1 sm:w-auto rounded-xl border border-white/12 bg-[#07090e]/90 px-3 py-1.5 text-base sm:text-xs font-medium text-slate-100 focus:border-accent focus:outline-none"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status === "completed" ? "Ended" : "Live"})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div />
                )}

                {myPerformance && myPerformance.prize > 0 && (
                  <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    <CheckIcon className="size-3.5 shrink-0" />
                    <span>
                      {isSessionEnded ? "Prize Won:" : "Projected Prize:"}{" "}
                      <strong className="font-mono text-white">
                        ₦{myPerformance.prize.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Read-Only Metric Strip */}
            <dl className="grid grid-cols-4 divide-x divide-white/10 border-y border-white/[0.08] py-2.5">
              <div className="pr-2 sm:pr-4 min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Pool
                </dt>
                <dd className="mt-0.5 font-display text-sm sm:text-base font-bold text-amber-300 tabular-nums truncate">
                  ₦{animatedPrizePool.toLocaleString()}
                </dd>
              </div>

              <div className="px-2 sm:px-4 min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Guesses
                </dt>
                <dd className="mt-0.5 font-display text-sm sm:text-base font-bold text-white tabular-nums">
                  {animatedGuesses.toLocaleString()}
                </dd>
              </div>

              <div className="px-2 sm:px-4 min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Players
                </dt>
                <dd className="mt-0.5 font-display text-sm sm:text-base font-bold text-white tabular-nums">
                  {summary?.uniquePlayers ?? leaderboard.length}
                </dd>
              </div>

              <div className="pl-2 sm:pl-4 min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400 truncate">
                  Your Score
                </dt>
                <dd className="mt-0.5 font-display text-sm sm:text-base font-bold text-accent tabular-nums truncate">
                  {myPerformance?.rank
                    ? `${formatOrdinal(myPerformance.rank)} · ${animatedMyScore}p`
                    : `${animatedMyScore} pts`}
                </dd>
              </div>
            </dl>

            {/* Section Tabs (Scroll Away Naturally With Body) */}
            <div
              role="tablist"
              aria-label="Session results sections"
              className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto rounded-xl border border-white/10 bg-[#07090e]/90 p-1 gap-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "feedback"}
                onClick={() => {
                  setActiveTab("feedback");
                  setBarAnimKey((k) => k + 1);
                }}
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "feedback"
                    ? "bg-accent text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BarChartIcon className="size-3.5 shrink-0" />
                <span className="sm:hidden">Votes ({questionFeedbacks.length})</span>
                <span className="hidden sm:inline">Crowd Votes ({questionFeedbacks.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "winners"}
                onClick={() => {
                  setActiveTab("winners");
                  playRankClimb();
                }}
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "winners"
                    ? "bg-accent text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <TrophyIcon className="size-3.5 shrink-0" />
                <span className="sm:hidden">
                  {isSessionEnded ? "Winners" : "Ranks"} ({leaderboard.length})
                </span>
                <span className="hidden sm:inline">
                  {isSessionEnded ? "Winners" : "Leaderboard"} ({leaderboard.length})
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "mypicks"}
                onClick={() => setActiveTab("mypicks")}
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "mypicks"
                    ? "bg-accent text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <TargetIcon className="size-3.5 shrink-0" />
                <span>My Picks</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs font-medium text-slate-400">
              Loading session results...
            </p>
          </div>
        ) : (
          <>
            {!isSessionEnded && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <LockIcon className="size-4 shrink-0 text-emerald-300 mt-0.5" />
                  <p className="text-xs text-slate-200 leading-relaxed">
                    <strong className="text-emerald-300">{sessionMeta?.name}</strong> is still active. Crowd vote shares stay sealed while players can still submit rounds.
                  </p>
                </div>

                {completedSessionOption && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleSelectSessionInModal(completedSessionOption.id)
                    }
                    className="min-h-9 self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-2 text-xs font-semibold text-amber-200 transition-colors"
                  >
                    <span>View {completedSessionOption.name}</span>
                  </button>
                )}
              </div>
            )}

            {/* Tab 1: Question-by-Question Crowd Votes */}
            {activeTab === "feedback" && (
              <div className="space-y-4 animate-fade-in">
                <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400 tabular-nums">
                      Question{" "}
                      <strong className="text-white">
                        {Math.min(selectedQuestionIdx + 1, Math.max(1, questionFeedbacks.length))}
                      </strong>{" "}
                      of {questionFeedbacks.length}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSessionEnded && (
                        <button
                          type="button"
                          aria-pressed={autoCycleQuestions}
                          onClick={() => setAutoCycleQuestions((v) => !v)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                            autoCycleQuestions
                              ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-300"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
                          }`}
                        >
                          <PlayIcon className="size-3" />
                          <span>{autoCycleQuestions ? "Pause" : "Auto-play"}</span>
                        </button>
                      )}

                      <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] divide-x divide-white/10">
                        <button
                          type="button"
                          aria-label="Previous question"
                          onClick={() =>
                            handleSelectQuestionIdx(
                              (selectedQuestionIdx - 1 + questionFeedbacks.length) %
                                Math.max(1, questionFeedbacks.length),
                            )
                          }
                          className="inline-flex h-8 items-center gap-1 px-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors"
                        >
                          <ChevronRightIcon className="size-3.5 rotate-180" />
                          <span className="hidden sm:inline">Prev</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Next question"
                          onClick={() =>
                            handleSelectQuestionIdx(
                              (selectedQuestionIdx + 1) %
                                Math.max(1, questionFeedbacks.length),
                            )
                          }
                          className="inline-flex h-8 items-center gap-1 px-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRightIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Uniform 5x2 mobile / 10x1 desktop Question Selector */}
                  <div
                    role="group"
                    aria-label="Select question"
                    className="grid grid-cols-5 sm:grid-cols-10 gap-1.5"
                  >
                    {questionFeedbacks.map((qf, idx) => {
                      const isCurrent = idx === selectedQuestionIdx;
                      const earned = isSessionEnded ? qf.myPointsEarned : null;
                      return (
                        <button
                          key={qf.questionId}
                          type="button"
                          aria-current={isCurrent ? "step" : undefined}
                          onClick={() => handleSelectQuestionIdx(idx)}
                          className={`flex min-h-9 flex-col items-center justify-center rounded-lg border py-1 text-center transition-all tabular-nums ${
                            isCurrent
                              ? "border-accent bg-accent text-white shadow-sm"
                              : "border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <span className="text-xs font-bold leading-none">
                            Q{qf.position}
                          </span>
                          {earned !== null && (
                            <span
                              className={`mt-0.5 font-mono text-[9px] font-semibold leading-none ${
                                isCurrent
                                  ? "text-white/90"
                                  : earned === 10
                                  ? "text-emerald-300"
                                  : "text-slate-400"
                              }`}
                            >
                              +{earned}p
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {currentQuestion ? (
                  <div
                    key={`${currentQuestion.questionId}-${barAnimKey}`}
                    className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden animate-fade-in"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 bg-white/[0.02] px-4 py-3.5 sm:px-5 sm:py-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                              Q{currentQuestion.position}
                            </span>
                            <span className="text-white/20">/</span>
                            <span className="font-medium text-slate-300">
                              {currentQuestion.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {currentQuestion.totalSelections.toLocaleString()} picks · Avg{" "}
                            {formatResponseSec(currentQuestion.avgResponseMs)}
                          </span>
                        </div>
                        <h3 className="font-display text-base sm:text-xl font-bold text-white leading-snug">
                          {currentQuestion.title}
                        </h3>
                      </div>

                      {isSessionEnded && currentQuestion.myPointsEarned !== null ? (
                        <div className="flex items-center gap-2 sm:block sm:text-right shrink-0 pt-1 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Your Q{currentQuestion.position} Score
                          </p>
                          <p className="font-mono text-xs sm:text-sm font-bold text-emerald-300 tabular-nums">
                            +{currentQuestion.myPointsEarned} pts{" "}
                            <span className="text-xs font-normal text-slate-400">
                              ({formatResponseSec(currentQuestion.myResponseMs ?? 0)})
                            </span>
                          </p>
                        </div>
                      ) : !isSessionEnded ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 shrink-0">
                          <LockIcon className="size-3.5" />
                          <span>Unlocks when session closes</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Mobile Stacked Option Cards (<640px) */}
                    <div className="divide-y divide-white/[0.06] sm:hidden">
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
                        return (
                          <div
                            key={opt.optionId}
                            className={`p-3.5 space-y-2 ${
                              isSessionEnded && opt.isMostSelected
                                ? "bg-emerald-500/[0.06]"
                                : opt.isMyPick
                                ? "bg-accent/[0.08]"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-mono text-xs text-slate-400 shrink-0">
                                  #{isSessionEnded ? opt.rank : idx + 1}
                                </span>
                                {hasImage && opt.mediaUrl ? (
                                  <img
                                    src={opt.mediaUrl}
                                    alt={opt.label}
                                    width={80}
                                    height={80}
                                    loading="lazy"
                                    className="size-10 aspect-square rounded-lg object-cover object-center border border-white/15 bg-[#0e1320] shrink-0"
                                  />
                                ) : hasColor && opt.mediaUrl ? (
                                  <span
                                    className="size-6 rounded-full border-2 border-white/80 shrink-0"
                                    style={{ backgroundColor: opt.mediaUrl }}
                                  />
                                ) : null}
                                <span className="text-sm font-bold text-white truncate">
                                  {opt.label}
                                </span>
                                {opt.isMyPick && (
                                  <span className="shrink-0 rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent">
                                    Your pick
                                  </span>
                                )}
                              </div>

                              <span className="shrink-0 font-mono text-xs font-bold text-amber-300 tabular-nums">
                                {isSessionEnded
                                  ? `${opt.points} ${opt.points === 1 ? "pt" : "pts"}`
                                  : "10 to 1 pts"}
                              </span>
                            </div>

                            {isSessionEnded ? (
                              <div className="flex items-center gap-2.5">
                                <div className="h-2 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
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
                                <span className="font-mono text-xs text-slate-300 tabular-nums shrink-0">
                                  {opt.percentage}% ({opt.selectionCount})
                                </span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500">
                                Vote share sealed until session closes
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop 7-Column Table (>=640px) */}
                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby={feedbackTableCaptionId}
                      className="hidden sm:block overflow-x-auto"
                    >
                      <table className="w-full text-sm border-collapse">
                        <caption id={feedbackTableCaptionId} className="sr-only">
                          Crowd selection feedback for {currentQuestion.title}
                        </caption>
                        <thead>
                          <tr className="border-b border-white/10 bg-[#090c14] text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="py-3 pl-5 pr-3 w-14">
                              {isSessionEnded ? "Rank" : "No."}
                            </th>
                            <th className="py-3 px-3">Option</th>
                            <th className="py-3 px-3 text-right w-20">Votes</th>
                            <th className="py-3 px-4 w-64">Crowd Share</th>
                            <th className="py-3 px-3 text-center w-24">Points</th>
                            <th className="py-3 px-3 text-right w-20">Avg Time</th>
                            <th className="py-3 pl-3 pr-5 text-right w-36">
                              Standing
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
                                        width={88}
                                        height={88}
                                        loading="lazy"
                                        className="size-11 aspect-square rounded-lg object-cover object-center border border-white/15 bg-[#0e1320] shrink-0"
                                      />
                                    ) : hasColor && opt.mediaUrl ? (
                                      <span
                                        className="size-8 rounded-full border-2 border-white/80 shrink-0"
                                        style={{ backgroundColor: opt.mediaUrl }}
                                      />
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-bold text-white">
                                        {opt.label}
                                      </span>
                                      {opt.isMyPick && (
                                        <span className="inline-flex items-center rounded-full border border-accent/50 bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                                          Your Pick
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </th>

                                <td className="py-3 px-3 text-right font-mono text-sm font-bold text-white tabular-nums">
                                  {isSessionEnded ? (
                                    opt.selectionCount
                                  ) : (
                                    <LockIcon className="inline size-3.5 text-slate-500" />
                                  )}
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
                                    <span className="text-xs text-slate-500">
                                      Sealed until session closes
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
                                      10 to 1 pts
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-slate-300 tabular-nums">
                                  {isSessionEnded
                                    ? formatResponseSec(opt.avgResponseMs)
                                    : "-"}
                                </td>

                                <td className="py-3 pl-3 pr-5 text-right">
                                  {!isSessionEnded ? (
                                    <span className="font-mono text-xs text-slate-500">
                                      Sealed
                                    </span>
                                  ) : opt.isMostSelected ? (
                                    <span className="inline-flex items-center rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                      Most Picked
                                    </span>
                                  ) : opt.isLeastSelected ? (
                                    <span className="inline-flex items-center rounded-md bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                                      Least Picked
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
                  <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-8 text-center text-sm text-slate-400">
                    No question breakdown available for this session yet.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Winners & Leaderboard */}
            {activeTab === "winners" && (
              <div className="space-y-4 animate-fade-in">
                {top3Winners.length > 0 && (
                  <div
                    className={`grid gap-2.5 sm:gap-3.5 items-end pt-1 ${
                      top3Winners.length === 1
                        ? "grid-cols-1 max-w-xs mx-auto"
                        : top3Winners.length === 2
                        ? "grid-cols-2 max-w-lg mx-auto"
                        : "grid-cols-3"
                    }`}
                  >
                    {top3Winners[1] && (() => {
                      const p2 = getPlayerDisplay(top3Winners[1]);
                      return (
                        <div
                          style={{ animationDelay: "120ms" }}
                          className="animate-gw-podium order-2 sm:order-1 min-w-0 rounded-2xl border border-slate-400/25 bg-gradient-to-b from-slate-400/12 to-[#0d111c] p-3 sm:p-4 text-center space-y-1.5"
                        >
                          <div className="flex justify-center">
                            <Avatar
                              name={p2.name}
                              src={p2.avatarUrl}
                              size="md"
                              rank={2}
                            />
                          </div>
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
                            {isSessionEnded ? "2nd Place" : "Rank #2"}
                          </p>
                          <p className="font-display text-xs sm:text-base font-bold text-white truncate">
                            {p2.name}
                          </p>
                          <p className="font-display text-sm sm:text-lg font-extrabold text-emerald-300 tabular-nums truncate">
                            ₦{Number(top3Winners[1].prize || 50000).toLocaleString()}
                          </p>
                          <p className="font-mono text-[10px] sm:text-xs text-slate-400 tabular-nums truncate">
                            {top3Winners[1].points}p ·{" "}
                            {formatTotalClock(top3Winners[1].response_ms)}
                          </p>
                        </div>
                      );
                    })()}

                    {top3Winners[0] && (() => {
                      const p1 = getPlayerDisplay(top3Winners[0]);
                      return (
                        <div
                          style={{ animationDelay: "0ms" }}
                          className={`animate-gw-podium min-w-0 rounded-2xl border border-amber-400/45 bg-gradient-to-b from-amber-500/20 via-amber-500/8 to-[#0d111c] p-3.5 sm:p-5 text-center space-y-1.5 sm:space-y-2 ${
                            top3Winners.length >= 2 ? "order-1 sm:order-2" : ""
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <CrownIcon className="size-4 sm:size-5 text-amber-300" />
                            <Avatar
                              name={p1.name}
                              src={p1.avatarUrl}
                              size="lg"
                              rank={1}
                            />
                          </div>
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300 truncate">
                            {isSessionEnded ? "Champion" : "Rank #1"}
                          </p>
                          <p className="font-display text-sm sm:text-lg font-bold text-white truncate">
                            {p1.name}
                          </p>
                          <p className="font-display text-base sm:text-2xl font-extrabold text-amber-300 tabular-nums truncate">
                            ₦{Number(top3Winners[0].prize || 100000).toLocaleString()}
                          </p>
                          <p className="font-mono text-[10px] sm:text-xs text-amber-100/85 tabular-nums truncate">
                            {top3Winners[0].points}p ·{" "}
                            {formatTotalClock(top3Winners[0].response_ms)}
                          </p>
                        </div>
                      );
                    })()}

                    {top3Winners[2] && (() => {
                      const p3 = getPlayerDisplay(top3Winners[2]);
                      return (
                        <div
                          style={{ animationDelay: "220ms" }}
                          className="animate-gw-podium order-3 min-w-0 rounded-2xl border border-amber-700/35 bg-gradient-to-b from-amber-700/15 to-[#0d111c] p-3 sm:p-4 text-center space-y-1.5"
                        >
                          <div className="flex justify-center">
                            <Avatar
                              name={p3.name}
                              src={p3.avatarUrl}
                              size="md"
                              rank={3}
                            />
                          </div>
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 truncate">
                            {isSessionEnded ? "3rd Place" : "Rank #3"}
                          </p>
                          <p className="font-display text-xs sm:text-base font-bold text-white truncate">
                            {p3.name}
                          </p>
                          <p className="font-display text-sm sm:text-lg font-extrabold text-emerald-300 tabular-nums truncate">
                            ₦{Number(top3Winners[2].prize || 20000).toLocaleString()}
                          </p>
                          <p className="font-mono text-[10px] sm:text-xs text-slate-400 tabular-nums truncate">
                            {top3Winners[2].points}p ·{" "}
                            {formatTotalClock(top3Winners[2].response_ms)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-white">
                        {isSessionEnded ? "Final Session Leaderboard" : "Live Session Leaderboard"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Ranked by crowd points, then shortest completion time.
                      </p>
                    </div>
                    <div className="w-full sm:w-60">
                      <label htmlFor="popup-winner-search" className="sr-only">
                        Search players
                      </label>
                      <input
                        id="popup-winner-search"
                        type="search"
                        value={winnerSearch}
                        onChange={(e) => setWinnerSearch(e.target.value)}
                        placeholder="Search player..."
                        className="min-h-10 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-1.5 text-base sm:text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mobile Rows */}
                  <div className="space-y-2 sm:hidden">
                    {filteredLeaderboard.length > 0 ? (
                      filteredLeaderboard.map((row) => {
                        const { name, avatarUrl, isMe } = getPlayerDisplay(row);
                        return (
                          <div
                            key={row.user_id}
                            className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 ${
                              isMe
                                ? "border-accent/35 bg-accent/10"
                                : "border-white/[0.06] bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`font-display text-xs font-bold w-7 shrink-0 tabular-nums ${
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
                                  {row.points} pts · {formatTotalClock(row.response_ms)}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-emerald-300 tabular-nums shrink-0">
                              {row.prize > 0 ? `₦${row.prize.toLocaleString()}` : "-"}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-500">
                        No players matching your search.
                      </p>
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={winnersTableCaptionId}
                    className="hidden sm:block overflow-x-auto"
                  >
                    <table className="w-full text-sm">
                      <caption id={winnersTableCaptionId} className="sr-only">
                        Session winners and rankings
                      </caption>
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                          <th className="py-2.5 pr-4">Rank</th>
                          <th className="py-2.5 pr-4">Player</th>
                          <th className="py-2.5 pr-4">
                            {isSessionEnded ? "Prize (₦)" : "Projected Prize (₦)"}
                          </th>
                          <th className="py-2.5 pr-4">Points</th>
                          <th className="py-2.5 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="stagger">
                        {filteredLeaderboard.map((row) => {
                          const { name, avatarUrl, isMe } = getPlayerDisplay(row);
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
                                className="py-3 pr-4 font-display font-bold text-left whitespace-nowrap"
                              >
                                {formatOrdinal(row.rank)}
                              </th>
                              <td className="py-3 pr-4">
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
                              <td className="py-3 pr-4 font-mono text-emerald-300 font-semibold tabular-nums">
                                {row.prize > 0
                                  ? `₦${row.prize.toLocaleString()}`
                                  : "-"}
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

            {/* Tab 3: My Picks Scorecard */}
            {activeTab === "mypicks" && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger">
                  {questionFeedbacks.map((qf) => {
                    const topOpt = qf.options[0];
                    const myOpt = qf.options.find((o) => o.isMyPick);
                    const matchedTop =
                      isSessionEnded &&
                      myOpt &&
                      topOpt &&
                      myOpt.optionId === topOpt.optionId;

                    return (
                      <button
                        key={qf.questionId}
                        type="button"
                        onClick={() => {
                          setSelectedQuestionIdx(qf.position - 1);
                          setActiveTab("feedback");
                          setBarAnimKey((k) => k + 1);
                        }}
                        className={`text-left rounded-2xl border p-4 transition-all hover:border-accent/50 ${
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
                              {matchedTop ? " · Top Pick" : ""}
                            </span>
                          ) : (
                            <span className="text-[11px] text-accent font-semibold">
                              Inspect
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
                                  {topOpt?.label ?? "-"}
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
                                  Sealed
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Unlocks at 00:00
                                </p>
                              </>
                            )}
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Your Pick
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
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Non-pinned scroll-end Done button (never blocks viewport while scrolling) */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => void closeTopLayer()}
                className="min-h-10 w-full sm:w-auto rounded-xl border border-white/12 bg-white/[0.05] hover:bg-white/[0.1] px-6 py-2.5 text-xs font-bold text-slate-200 hover:text-white transition-colors"
              >
                Close Results
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
