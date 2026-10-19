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

// ─── Join Session ────────────────────────────────────────────────────────────

export async function joinSession(sessionId: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();

  try {
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const { data: existing } = await supabase
        .from("session_entries")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (existing) return existing.id;

      const { data, error } = await supabase.rpc("join_session", {
        p_session_id: sessionId,
      });

      if (!error && data) {
        return data as string;
      }

      if (error) {
        if (error.message.includes("insufficient coins")) {
          throw new Error(
            "You don't have enough coins to join this session. Buy more coins from your wallet.",
          );
        }
        if (error.message.includes("session not open")) {
          throw new Error("This session is no longer open for entry.");
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("enough coins") || msg.includes("no longer open")) {
      throw err;
    }
    // Otherwise fall through to local session entry
  }

  // Local fallback entry when remote Supabase is paused/offline
  const userId = getFallbackUserId();
  const localEntryKey = `gw_entry_${userId}_${sessionId}`;
  if (typeof window !== "undefined") {
    const existingEntryId = localStorage.getItem(localEntryKey);
    if (existingEntryId) return existingEntryId;

    const newEntryId = `local-entry-${sessionId}-${Date.now()}`;
    localStorage.setItem(localEntryKey, newEntryId);
    // Deduct 50 coins locally
    const prevBonus = Number(localStorage.getItem(`gw_bonus_coins_${userId}`) ?? "0");
    localStorage.setItem(`gw_bonus_coins_${userId}`, String(prevBonus - 50));
    return newEntryId;
  }

  return `local-entry-${sessionId}`;
}

// ─── Fetch Session Questions ─────────────────────────────────────────────────

export async function getSessionQuestions(sessionId: string): Promise<SessionQuestion[]> {
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

// ─── Submit Answer ───────────────────────────────────────────────────────────

export async function submitAnswer(
  entryId: string,
  questionId: string,
  optionId: string,
  responseMs: number,
  isLocked2x = false,
): Promise<void> {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(`gw_answers_${entryId}`);
    const map = raw ? JSON.parse(raw) : {};
    map[questionId] = { optionId, responseMs, isLocked2x };
    localStorage.setItem(`gw_answers_${entryId}`, JSON.stringify(map));
  }

  if (entryId.startsWith("local-entry-")) {
    return;
  }

  try {
    const supabase = createSupabaseBrowserClient();

    let { error } = await supabase.rpc("submit_answer", {
      p_entry_id: entryId,
      p_question_id: questionId,
      p_option_id: optionId,
      p_response_ms: responseMs,
      p_is_locked_2x: isLocked2x,
    });

    if (
      error &&
      (error.message.includes("p_is_locked_2x") || error.message.includes("function submit_answer"))
    ) {
      const retry = await supabase.rpc("submit_answer", {
        p_entry_id: entryId,
        p_question_id: questionId,
        p_option_id: optionId,
        p_response_ms: responseMs,
      });
      error = retry.error;
    }

    if (error && error.message.includes("entry not open")) {
      throw new Error("This session has closed. Your answer could not be submitted.");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("session has closed")) throw err;
  }
}

// ─── Check Existing Entry ────────────────────────────────────────────────────

export async function getExistingEntry(sessionId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const { data } = await supabase
        .from("session_entries")
        .select("id, completed_at, total_score, final_rank")
        .eq("session_id", sessionId)
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (data) return data;
    }
  } catch {
    // Fall through
  }

  if (typeof window !== "undefined") {
    const userId = getFallbackUserId();
    const localEntryId = localStorage.getItem(`gw_entry_${userId}_${sessionId}`);
    if (localEntryId) {
      const rawAnswers = localStorage.getItem(`gw_answers_${localEntryId}`);
      const answers = rawAnswers ? JSON.parse(rawAnswers) : {};
      const count = Object.keys(answers).length;
      return {
        id: localEntryId,
        completed_at: count >= VIRAL_DEMO_QUESTIONS.length ? new Date().toISOString() : null,
        total_score: null,
        final_rank: null,
      };
    }
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
