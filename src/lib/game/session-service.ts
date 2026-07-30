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

// ─── Join Session ────────────────────────────────────────────────────────────

export async function joinSession(sessionId: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();

  // Check if already joined
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("session_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.user.id)
    .maybeSingle();

  if (existing) return existing.id;

  // Call the RPC to atomically join + deduct coins
  const { data, error } = await supabase.rpc("join_session", {
    p_session_id: sessionId,
  });

  if (error) {
    if (error.message.includes("insufficient coins")) {
      throw new Error("You don't have enough coins to join this session. Buy more coins from your wallet.");
    }
    if (error.message.includes("session not open")) {
      throw new Error("This session is no longer open for entry.");
    }
    throw error;
  }

  return data as string;
}

// ─── Fetch Session Questions ─────────────────────────────────────────────────

export async function getSessionQuestions(sessionId: string): Promise<SessionQuestion[]> {
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

  if (error) throw error;

  // Sort options within each question
  return (data ?? []).map((sq) => ({
    ...sq,
    questions: {
      ...sq.questions,
      question_options: (sq.questions as SessionQuestion["questions"]).question_options.sort(
        (a, b) => a.position - b.position,
      ),
    },
  })) as SessionQuestion[];
}

// ─── Submit Answer ───────────────────────────────────────────────────────────

export async function submitAnswer(
  entryId: string,
  questionId: string,
  optionId: string,
  responseMs: number,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.rpc("submit_answer", {
    p_entry_id: entryId,
    p_question_id: questionId,
    p_option_id: optionId,
    p_response_ms: responseMs,
  });

  if (error) {
    if (error.message.includes("entry not open")) {
      throw new Error("This session has closed. Your answer could not be submitted.");
    }
    throw error;
  }
}

// ─── Check Existing Entry ────────────────────────────────────────────────────

export async function getExistingEntry(sessionId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data } = await supabase
    .from("session_entries")
    .select("id, completed_at, total_score, final_rank")
    .eq("session_id", sessionId)
    .eq("user_id", user.user.id)
    .maybeSingle();

  return data;
}

// ─── Get My Submitted Answers for an Entry ───────────────────────────────────

export async function getMyAnswers(entryId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("answers")
    .select("question_id, option_id, response_ms")
    .eq("entry_id", entryId);

  if (error) throw error;

  const map: Record<string, { optionId: string; responseMs: number }> = {};
  for (const a of data ?? []) {
    map[a.question_id] = { optionId: a.option_id, responseMs: a.response_ms };
  }
  return map;
}
