"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightIcon,
  BrainIcon,
  CloseIcon,
  HeadsetIcon,
  HelpCircleIcon,
  SendIcon,
} from "@/components/ui/Icons";

const OPEN_FAQ_AI_EVENT = "gw-open-faq-ai";

const STARTER_QUESTIONS = [
  "How does 10 to 1 scoring work?",
  "How do I get paid if I win?",
  "Does replaying lower my rank?",
  "How much is the prize pool right now?",
  "Does GuessWhat really pay?",
  "How do referral cash prizes work?",
];

type AssistantAction = {
  label: string;
  href: string;
};

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  matchedTopic?: string;
  category?: string;
  mode?: "gemini" | "knowledge_bank";
  actions?: AssistantAction[];
  followUps?: string[];
  suggestSupport?: boolean;
};

const INITIAL_ASSISTANT_TURN: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm the GuessWhat AI Help Assistant. Ask me anything about 10-to-1 scoring, cash payouts, bank setup, referral prizes, or live sessions.",
  matchedTopic: "Knowledge Bank Ready",
  category: "FAQ Assistant",
  followUps: STARTER_QUESTIONS.slice(0, 4),
};

export function openFaqAssistant(initialQuestion?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_FAQ_AI_EVENT, {
      detail: { question: initialQuestion || "" },
    }),
  );
}

export function AskAiFaqButton({
  className = "",
  label = "Ask AI Help",
  initialQuestion,
}: {
  className?: string;
  label?: string;
  initialQuestion?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openFaqAssistant(initialQuestion)}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-5 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors ${className}`}
    >
      <BrainIcon className="size-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function FaqAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([INITIAL_ASSISTANT_TURN]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sendQuestion = useCallback(
    async (rawQuestion: string) => {
      const q = rawQuestion.trim();
      if (!q || thinking) return;

      const userTurn: ChatTurn = {
        id: `u_${Date.now()}`,
        role: "user",
        content: q,
      };
      const nextHistory = [...messages, userTurn];
      setMessages(nextHistory);
      setInput("");
      setThinking(true);

      try {
        const res = await fetch("/api/faq-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            history: nextHistory
              .filter((m) => m.id !== "welcome")
              .slice(-6)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.answer) {
          throw new Error(data.error || "Unable to fetch answer");
        }

        const aiTurn: ChatTurn = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: String(data.answer),
          matchedTopic: data.matchedTopic,
          category: data.category,
          mode: data.mode,
          actions: Array.isArray(data.actions) ? data.actions : [],
          followUps: Array.isArray(data.followUps) ? data.followUps : [],
          suggestSupport: Boolean(data.suggestSupport),
        };
        setMessages((prev) => [...prev, aiTurn]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, I had trouble reaching the Knowledge Bank just now. Please try asking again or open the Support Desk directly.",
            actions: [{ label: "Open Support Desk", href: "/support" }],
            suggestSupport: true,
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [messages, thinking],
  );

  // Listen for imperative open events (e.g. from How to Play or Support page)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ question?: string }>).detail;
      setOpen(true);
      if (detail?.question) {
        setTimeout(() => {
          void sendQuestion(detail.question!);
        }, 80);
      }
    };
    window.addEventListener(OPEN_FAQ_AI_EVENT, handler);
    return () => window.removeEventListener(OPEN_FAQ_AI_EVENT, handler);
  }, [sendQuestion]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!open) return;
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages, thinking]);

  // Focus input when opened on desktop
  useEffect(() => {
    if (open && typeof window !== "undefined" && window.innerWidth >= 640) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  // Never clutter active gameplay screen
  if (pathname.startsWith("/play")) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  return (
    <>
      {/* Floating Launcher Pill */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open GuessWhat AI FAQ Assistant"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3.5 md:bottom-6 md:right-6 z-40 inline-flex items-center gap-2 rounded-full border border-accent/45 bg-[#121829]/95 px-3.5 py-2.5 text-xs font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(247,145,27,0.22)] backdrop-blur-md hover:border-accent hover:bg-[#192238] active:scale-95 transition-all"
        >
          <span className="grid size-6 place-items-center rounded-full gradient-brand text-white">
            <BrainIcon className="size-3.5" />
          </span>
          <span>Ask AI</span>
        </button>
      )}

      {/* Slide-Up / Slide-Over AI Chat Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-[59] flex items-end sm:items-end justify-end bg-black/60 sm:bg-black/35 backdrop-blur-[2px] p-0 sm:p-5 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="GuessWhat AI FAQ Assistant"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[84dvh] sm:h-[600px] sm:max-h-[85dvh] w-full sm:w-[410px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#0c101b] shadow-[0_24px_70px_rgba(0,0,0,0.75)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#121829] px-4 py-3.5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-brand text-white shadow-sm">
                  <BrainIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-sm font-bold text-white truncate">
                      GuessWhat AI Help
                    </h2>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                      Instant FAQ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Trained on GuessWhat rules, payouts &amp; live sessions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setMessages([INITIAL_ASSISTANT_TURN])}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close AI Help"
                  className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white transition-colors"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "gradient-brand text-white font-medium rounded-br-md"
                        : "border border-white/10 bg-[#141b2d] text-slate-200 rounded-bl-md"
                    }`}
                  >
                    {m.role === "assistant" && m.matchedTopic && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                        <HelpCircleIcon className="size-3 shrink-0" />
                        <span className="truncate">{m.matchedTopic}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line">{m.content}</p>

                    {/* Direct In-App Action Links */}
                    {m.role === "assistant" && m.actions && m.actions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.actions.map((act) => (
                          <Link
                            key={`${act.href}-${act.label}`}
                            href={act.href}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/15 hover:bg-accent/25 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-colors"
                          >
                            <span>{act.label}</span>
                            <ArrowRightIcon className="size-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Follow-Up Question Chips */}
                  {m.role === "assistant" &&
                    m.followUps &&
                    m.followUps.length > 0 &&
                    m.id === messages[messages.length - 1]?.id &&
                    !thinking && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                        {m.followUps.map((fq) => (
                          <button
                            key={fq}
                            type="button"
                            onClick={() => void sendQuestion(fq)}
                            className="rounded-full border border-white/12 bg-white/[0.04] hover:border-accent/50 hover:bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-slate-200 transition-colors text-left"
                          >
                            {fq}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {thinking && (
                <div className="flex items-start">
                  <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#141b2d] px-4 py-3 text-xs text-slate-400 inline-flex items-center gap-2">
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                    <span>Searching Knowledge Bank...</span>
                  </div>
                </div>
              )}
              <div ref={scrollEndRef} />
            </div>

            {/* Footer Input + Human Support Escape Hatch */}
            <div className="border-t border-white/10 bg-[#101524] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2 shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about scoring, payouts, referrals..."
                  maxLength={320}
                  className="min-h-10 flex-1 rounded-xl border border-white/12 bg-[#07090e] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={thinking || !input.trim()}
                  aria-label="Send question"
                  className="grid size-10 shrink-0 place-items-center rounded-xl gradient-brand text-white disabled:opacity-45 hover:brightness-110 transition-all"
                >
                  <SendIcon className="size-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Need a real human agent?</span>
                <Link
                  href="/support"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                >
                  <HeadsetIcon className="size-3.5" />
                  <span>Open Support Desk</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
