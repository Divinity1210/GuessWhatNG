import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

export type SessionCompleteStats = {
  rank: number;
  points: number;
  responseMs: number;
  prize: number;
  latestPoints?: number;
  latestResponseMs?: number;
  attemptsCount?: number;
  isBestRetained?: boolean;
};

const UUID_RE = /^[0-9a-f-]{36}$/i;

function getStoredRealUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const direct = localStorage.getItem("gw_real_user_id");
    if (direct && UUID_RE.test(direct)) return direct;
    const raw = localStorage.getItem("gw_demo_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && UUID_RE.test(parsed.id)) return parsed.id;
    }
  } catch {
    // ignore
  }
  return null;
}

// ─── Join Session (Free to Play + Supports Replay) ───────────────────────────

export async function joinSession(
  sessionId: string,
  replay = false,
  explicitUserId?: string,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  let userId: string | null =
    explicitUserId && UUID_RE.test(explicitUserId) ? explicitUserId : null;

  if (!userId) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id && UUID_RE.test(authData.user.id)) {
        userId = authData.user.id;
      }
    } catch {
      // Fall through to stored real user id
    }
  }

  if (!userId) {
    userId = getStoredRealUserId();
  }

  if (!userId) {
    throw new Error("Please log in or sign up to join this live session.");
  }

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
  if (!res.ok || !json.entryId) {
    throw new Error(json.error || "Unable to join game session.");
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(`gw_answers_${json.entryId}`);
  }

  return json.entryId as string;
}

// ─── Fetch Session Questions ─────────────────────────────────────────────────

export async function getSessionQuestions(
  sessionId: string,
): Promise<SessionQuestion[]> {
  try {
    const res = await fetch(
      `/api/game/session?sessionId=${encodeURIComponent(sessionId)}&includeQuestions=1`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.questions) && json.questions.length > 0) {
        return json.questions.filter(
          (sq: SessionQuestion) => sq.questions && sq.questions.question_options?.length > 0,
        ) as SessionQuestion[];
      }
    }
  } catch {
    // Fall through to direct Supabase browser query
  }

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
    // Return empty array if no questions found
  }

  return [];
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
  myStats?: SessionCompleteStats | null;
}> {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(`gw_answers_${entryId}`);
    const map = raw ? JSON.parse(raw) : {};
    map[questionId] = { optionId, responseMs, isLocked2x };
    localStorage.setItem(`gw_answers_${entryId}`, JSON.stringify(map));
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
