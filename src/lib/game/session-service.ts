import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { VIRAL_DEMO_QUESTIONS } from "@/lib/game/viral-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionQuestion = {
  position: number;
  question_id: string;
  questions: {
    id: string;
    title: string;
    category: string;
    type: string;
    question_options: {
      id: string;
      label: string;
      media_url: string | null;
      position: number;
    }[];
  };
};

export type GameState = {
  entryId: string;
  sessionId: string;
  sessionName: string;
  endsAt: string;
  questions: SessionQuestion[];
  currentIndex: number;
  answers: Record<string, { optionId: string; responseMs: number }>;
  completed: boolean;
};

function getFallbackUserId(): string {
  if (typeof window === "undefined") return "demo-naija-player";
  try {
    const raw = localStorage.getItem("gw_demo_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {
    // ignore
  }
  return "demo-naija-player";
}

// ─── Join Session (Free to Play + Supports Replay) ───────────────────────────

export async function joinSession(
  sessionId: string,
  replay = false,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (userId) {
      const res = await fetch("/api/game/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          sessionId,
          userId,
          replay,
        }),
      });
      const json = await res.json();
      if (res.ok && json.entryId) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(`gw_answers_${json.entryId}`);
        }
        return json.entryId as string;
      }
    }
  } catch {
    // Fall through to local fallback
  }

  const userId = getFallbackUserId();
  const localEntryKey = `gw_entry_${userId}_${sessionId}`;
  if (typeof window !== "undefined") {
    const newEntryId = `local-entry-${sessionId}-${Date.now()}`;
    localStorage.setItem(localEntryKey, newEntryId);
    return newEntryId;
  }

  return `local-entry-${sessionId}`;
}

// ─── Fetch Session Questions ─────────────────────────────────────────────────

export async function getSessionQuestions(
  sessionId: string,
): Promise<SessionQuestion[]> {
  try {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("session_questions")
      .select(`
        position,
        question_id,
        questions (
          id,
          title,
          category,
          type,
          question_options (
            id,
            label,
            media_url,
            position
          )
        )
      `)
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((sq) => {
        const q = (
          Array.isArray(sq.questions) ? sq.questions[0] : sq.questions
        ) as unknown as SessionQuestion["questions"];
        return {
          ...sq,
          questions: {
            ...q,
            question_options: (q?.question_options ?? []).sort(
              (a, b) => a.position - b.position,
            ),
          },
        };
      }) as unknown as SessionQuestion[];
    }
  } catch {
    // Fall through to demo questions
  }

  return VIRAL_DEMO_QUESTIONS.map((dq, idx) => ({
    position: idx + 1,
    question_id: dq.id,
    questions: {
      id: dq.id,
      title: dq.title,
      category: dq.category,
      type: "text",
      question_options: dq.options.map((o, oIdx) => ({
        id: o.id,
        label: o.label,
        media_url: null,
        position: oIdx + 1,
      })),
    },
  }));
}

// ─── Submit Answer & Recalculate Live Leaderboard ────────────────────────────

export async function submitAnswer(
  entryId: string,
  questionId: string,
  optionId: string,
  responseMs: number,
  isLocked2x = false,
  sessionId?: string,
): Promise<{
  completed?: boolean;
  myStats?: { rank: number; points: number; responseMs: number; prize: number } | null;
}> {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(`gw_answers_${entryId}`);
    const map = raw ? JSON.parse(raw) : {};
    map[questionId] = { optionId, responseMs, isLocked2x };
    localStorage.setItem(`gw_answers_${entryId}`, JSON.stringify(map));
  }

  if (entryId.startsWith("local-entry-")) {
    return {};
  }

  try {
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const supabase = createSupabaseBrowserClient();
      const { data: ent } = await supabase
        .from("session_entries")
        .select("session_id")
        .eq("id", entryId)
        .maybeSingle();
      targetSessionId = ent?.session_id;
    }

    if (targetSessionId) {
      const res = await fetch("/api/game/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          entryId,
          sessionId: targetSessionId,
          questionId,
          optionId,
          responseMs,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch {
    // Ignore
  }

  return {};
}

// ─── Check Existing Entry ────────────────────────────────────────────────────

export async function getExistingEntry(sessionId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const { data } = await supabase
        .from("session_entries")
        .select("id, completed_at, total_score, total_response_ms, final_rank")
        .eq("session_id", sessionId)
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (data) return data;
    }
  } catch {
    // Fall through
  }

  return null;
}

// ─── Get My Submitted Answers for an Entry ───────────────────────────────────

export async function getMyAnswers(entryId: string) {
  if (!entryId.startsWith("local-entry-")) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("answers")
        .select("question_id, option_id, response_ms")
        .eq("entry_id", entryId);

      if (!error && data && data.length > 0) {
        const map: Record<string, { optionId: string; responseMs: number; isLocked2x?: boolean }> =
          {};
        for (const a of data) {
          map[a.question_id] = { optionId: a.option_id, responseMs: a.response_ms };
        }
        return map;
      }
    } catch {
      // Fall through
    }
  }

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(`gw_answers_${entryId}`);
    if (raw) {
      try {
        return JSON.parse(raw) as Record<
          string,
          { optionId: string; responseMs: number; isLocked2x?: boolean }
        >;
      } catch {
        return {};
      }
    }
  }
  return {};
}
