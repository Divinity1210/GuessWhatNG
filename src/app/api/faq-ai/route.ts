import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  pickFollowUpQuestions,
  searchKnowledgeBank,
  type FaqArticle,
} from "@/lib/faq/knowledge-bank";

type CustomKbEntry = {
  id: string;
  title: string;
  category: string;
  keywords?: string[];
  sampleQuestions?: string[];
  answer: string;
  ctaLabel?: string;
  ctaHref?: string;
  active?: boolean;
};

type LiveContext = {
  sessionName: string | null;
  sessionStatus: string | null;
  prizePool: number;
  endsAt: string | null;
  timeRemainingText: string | null;
  referralPool: number;
  referralEnabled: boolean;
  referralSpots: number;
};

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended (results ready)";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h ${mins}m remaining`;
  return `${hours}h ${mins}m remaining`;
}

function isGreeting(q: string): boolean {
  const clean = q.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return /^(hi|hello|hey|good morning|good afternoon|good evening|yo|howfar|how far|sup|thanks|thank you)$/.test(
    clean,
  );
}

function isLiveSessionQuery(q: string): boolean {
  const lower = q.toLowerCase();
  return (
    /(current|live|now|active|this|next).*(session|pool|prize|end|close|timer|time left|countdown)/i.test(
      lower,
    ) ||
    /(when|what time).*(session|game).*(end|close|finish)/i.test(lower) ||
    /how much.*(prize pool|pool).*(now|today|current|active)/i.test(lower)
  );
}

async function tryGeminiAnswer(params: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  articles: FaqArticle[];
  live: LiveContext;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const kbContext = params.articles
    .map(
      (a, idx) =>
        `[${idx + 1}] ${a.title} (${a.category})\n${a.answer}${
          a.ctaHref ? `\nApp link: ${a.ctaLabel || a.ctaHref} (${a.ctaHref})` : ""
        }`,
    )
    .join("\n\n");

  const liveSnapshot = [
    params.live.sessionName
      ? `Current Session: ${params.live.sessionName} (${params.live.sessionStatus}), Prize Pool: ₦${params.live.prizePool.toLocaleString()}, Timer: ${params.live.timeRemainingText || "Active"}`
      : "Current Session: Check /play for the active live session.",
    params.live.referralEnabled
      ? `Referral Cash Leaderboard: Active, Total Pool: ₦${params.live.referralPool.toLocaleString()} across Top ${params.live.referralSpots} referrers.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemInstruction = [
    "You are the official GuessWhat AI Help Assistant inside the GuessWhat player app.",
    "Answer the player's question accurately, warmly, and concisely (2 to 5 short sentences max) using ONLY the Knowledge Bank facts and Live Snapshot below.",
    "Never invent prize amounts, dates, or rules that are not in the facts below.",
    "Never use em-dashes or en-dashes. Use plain punctuation and Nigerian Naira (₦) formatting.",
    "If the player has a personal account bug, missing payout, or complaint outside these facts, tell them honestly and guide them to open a Support ticket on /support.",
    "",
    "LIVE APP SNAPSHOT:",
    liveSnapshot,
    "",
    "KNOWLEDGE BANK FACTS:",
    kbContext,
  ].join("\n");

  const contents = [
    ...params.history.slice(-6).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, 600) }],
    })),
    {
      role: "user",
      parts: [{ text: params.question.slice(0, 600) }],
    },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7500);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 320,
          },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === "string" && text.trim()) {
      return text.replace(/[—–]/g, "-").trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    const history = Array.isArray(body.history)
      ? (body.history as { role: "user" | "assistant"; content: string }[])
      : [];

    if (!question) {
      return NextResponse.json(
        { error: "Please type a question first." },
        { status: 400 },
      );
    }

    // Load live session + admin custom knowledge bank + referral config in parallel
    let customArticles: FaqArticle[] = [];
    const live: LiveContext = {
      sessionName: null,
      sessionStatus: null,
      prizePool: 500_000,
      endsAt: null,
      timeRemainingText: null,
      referralPool: 135_000,
      referralEnabled: true,
      referralSpots: 10,
    };

    try {
      const supabase = createSupabaseServiceClient();
      const [{ data: sessions }, { data: settings }] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("name, status, prize_pool, ends_at")
          .in("status", ["active", "completed"])
          .order("starts_at", { ascending: false })
          .limit(5),
        supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["faq_knowledge_bank", "referral_leaderboard_config"]),
      ]);

      const active =
        (sessions ?? []).find(
          (s) =>
            s.status === "active" &&
            new Date(s.ends_at).getTime() > Date.now(),
        ) ?? (sessions ?? [])[0];

      if (active) {
        live.sessionName = active.name;
        live.sessionStatus = active.status;
        live.prizePool = Number(active.prize_pool ?? 500_000);
        live.endsAt = active.ends_at;
        live.timeRemainingText = active.ends_at
          ? formatCountdown(active.ends_at)
          : null;
      }

      for (const row of settings ?? []) {
        if (row.key === "faq_knowledge_bank") {
          const val = row.value as { entries?: CustomKbEntry[] } | CustomKbEntry[] | null;
          const rawList = Array.isArray(val)
            ? val
            : val && Array.isArray(val.entries)
              ? val.entries
              : [];
          customArticles = rawList
            .filter((e) => e && e.active !== false && e.title && e.answer)
            .map((e) => ({
              id: e.id,
              title: e.title,
              category: e.category || "Custom FAQ",
              keywords: Array.isArray(e.keywords) ? e.keywords : [],
              sampleQuestions: Array.isArray(e.sampleQuestions) ? e.sampleQuestions : [],
              answer: e.answer,
              ctaLabel: e.ctaLabel,
              ctaHref: e.ctaHref,
            }));
        }
        if (row.key === "referral_leaderboard_config") {
          const cfg = row.value as {
            enabled?: boolean;
            totalPool?: number;
            totalWinnerSpots?: number;
          } | null;
          if (cfg) {
            live.referralEnabled = cfg.enabled !== false;
            if (typeof cfg.totalPool === "number") live.referralPool = cfg.totalPool;
            if (typeof cfg.totalWinnerSpots === "number") {
              live.referralSpots = cfg.totalWinnerSpots;
            }
          }
        }
      }
    } catch {
      // Proceed gracefully with built-in knowledge bank if DB lookup blips
    }

    // 1. Handle greetings warmly without burning an LLM call
    if (isGreeting(question)) {
      const greetingLine = live.sessionName
        ? `Hello! I'm the GuessWhat AI Help Assistant. Right now ${live.sessionName} is on with a ₦${live.prizePool.toLocaleString()} prize pool (${live.timeRemainingText || "check Play"}). Ask me anything about rules, 10-to-1 scoring, payouts, referrals, or bank setup!`
        : "Hello! I'm the GuessWhat AI Help Assistant. Ask me anything about rules, 10-to-1 scoring, payouts, bank details, referrals, or Community Arena!";
      return NextResponse.json({
        ok: true,
        answer: greetingLine,
        mode: "knowledge_bank",
        matchedTopic: "Welcome",
        category: "Assistant",
        actions: [
          { label: "Play Free Now", href: "/play" },
          { label: "How to Play", href: "/how-to-play" },
        ],
        followUps: pickFollowUpQuestions(),
        suggestSupport: false,
      });
    }

    const searchRes = searchKnowledgeBank(question, customArticles);
    const topMatches = searchRes.matches;
    const best = topMatches[0];
    const second = topMatches[1];

    // 2. Try live Gemini 2.5 Flash grounded synthesis if GEMINI_API_KEY is configured
    const geminiText = await tryGeminiAnswer({
      question,
      history,
      articles: topMatches.map((m) => m.article),
      live,
    });

    const actions: { label: string; href: string }[] = [];
    if (best?.article.ctaLabel && best.article.ctaHref) {
      actions.push({ label: best.article.ctaLabel, href: best.article.ctaHref });
    }
    if (
      second &&
      second.score >= 5 &&
      second.article.ctaLabel &&
      second.article.ctaHref &&
      !actions.some((a) => a.href === second.article.ctaHref)
    ) {
      actions.push({ label: second.article.ctaLabel, href: second.article.ctaHref });
    }

    if (geminiText) {
      return NextResponse.json({
        ok: true,
        answer: geminiText,
        mode: "gemini",
        matchedTopic: best?.article.title || "GuessWhat Knowledge Bank",
        category: best?.article.category || "AI Assistant",
        actions: actions.slice(0, 2),
        followUps: pickFollowUpQuestions(best?.article.id),
        suggestSupport: searchRes.topScore < 3.5,
      });
    }

    // 3. Built-in Grounded Knowledge Synthesis Engine (always-on zero-key mode)
    if (isLiveSessionQuery(question) && live.sessionName) {
      const liveReply = `The current session is **${live.sessionName}** with a **₦${live.prizePool.toLocaleString()}** cash prize pool (${live.timeRemainingText || "open now"}). Entry and replays are 100% free until the timer hits 00:00, and the Top 36 players share the pool!`;
      return NextResponse.json({
        ok: true,
        answer: liveReply,
        mode: "knowledge_bank",
        matchedTopic: "Live Session Status",
        category: "Live Session",
        actions: [
          { label: "Play Free Now", href: "/play" },
          { label: "Live Leaderboard", href: "/leaderboard" },
        ],
        followUps: pickFollowUpQuestions("prize-pool-tiers"),
        suggestSupport: false,
      });
    }

    if (best && best.score >= 3.2) {
      let answer = best.article.answer;

      // Enrich live referral or prize pool answers with current real numbers
      if (best.article.id === "referral-cash-leaderboard" && live.referralEnabled) {
        answer += `\n\nRight now, the active Referral Cash Leaderboard pool is ₦${live.referralPool.toLocaleString()} shared across the Top ${live.referralSpots} referrers.`;
      } else if (best.article.id === "prize-pool-tiers" && live.sessionName) {
        answer += `\n\nCurrent session: ${live.sessionName} (₦${live.prizePool.toLocaleString()} pool, ${live.timeRemainingText || "live now"}).`;
      }

      // If a second article also scored very closely on a multi-part question, append a crisp extra tip
      if (
        second &&
        second.score >= 6.5 &&
        second.score >= best.score * 0.72 &&
        second.article.id !== best.article.id
      ) {
        answer += `\n\nAlso helpful (${second.article.title}): ${second.article.answer}`;
      }

      return NextResponse.json({
        ok: true,
        answer,
        mode: "knowledge_bank",
        matchedTopic: best.article.title,
        category: best.article.category,
        actions: actions.slice(0, 2),
        followUps: pickFollowUpQuestions(best.article.id),
        suggestSupport: best.article.id === "contact-human-support",
      });
    }

    // Low-confidence fallback: stay honest and offer direct human support handoff
    return NextResponse.json({
      ok: true,
      answer:
        "I couldn't find an exact match for that specific question in the GuessWhat Knowledge Bank. If this is about your personal account, a payout status, or a technical bug, tap Open Human Support below and our team will reply directly to your Inbox.",
      mode: "knowledge_bank",
      matchedTopic: "Need Human Support?",
      category: "Support",
      actions: [
        { label: "Open Human Support", href: "/support" },
        { label: "Read Full How to Play", href: "/how-to-play" },
      ],
      followUps: pickFollowUpQuestions(),
      suggestSupport: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assistant error" },
      { status: 500 },
    );
  }
}
