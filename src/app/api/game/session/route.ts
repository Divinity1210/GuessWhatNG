import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getOptionalAuthUser,
  isUuid,
  requireAuthUser,
} from "@/lib/supabase/api-auth";

const DEFAULT_PRIZE_STRUCTURE = [
  { rank_from: 1, rank_to: 1, amount: 100000 },
  { rank_from: 2, rank_to: 2, amount: 50000 },
  { rank_from: 3, rank_to: 3, amount: 20000 },
  { rank_from: 4, rank_to: 36, amount: 10000 },
];

type RecalculateMyEntry = {
  entryId: string;
  userId: string;
  rank: number;
  points: number;
  responseMs: number;
  prize: number;
  latestPoints: number;
  latestResponseMs: number;
  attemptsCount: number;
};

type RecalculateRpcResult = {
  totalPlayers: number;
  myEntry: RecalculateMyEntry | null;
};

type FeedbackSummaryRpcResult = {
  optionStats: {
    optionId: string;
    selectionCount: number;
    totalMs: number;
  }[];
  totalPlays: number;
  uniquePlayers: number;
  totalGuesses: number;
  avgQuestionMs: number;
  myEntry: {
    id: string;
    user_id: string;
    total_score: number | null;
    total_response_ms: number | null;
    final_rank: number | null;
    prize_awarded: number | null;
  } | null;
  myPicks: {
    questionId: string;
    optionId: string;
    responseMs: number;
  }[];
};

async function recalculateSessionViaRpc(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  sessionId: string,
  entryId?: string | null,
): Promise<RecalculateRpcResult> {
  const { data, error } = await supabase.rpc("recalculate_session_leaderboard", {
    p_session_id: sessionId,
    p_entry_id: entryId && isUuid(entryId) ? entryId : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const parsed = (data ?? {}) as Partial<RecalculateRpcResult>;
  return {
    totalPlayers: Number(parsed.totalPlayers ?? 0),
    myEntry: parsed.myEntry ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const includeQuestions = searchParams.get("includeQuestions") === "1";
    const includeFeedback = searchParams.get("includeFeedback") === "1";
    const preferCompleted = searchParams.get("preferCompleted") === "1";
    const entryIdParam = searchParams.get("entryId") || "";
    const supabase = createSupabaseServiceClient();

    const { data: allSessions } = await supabase
      .from("game_sessions")
      .select("id, name, status, starts_at, ends_at, prize_pool, prize_structure")
      .in("status", ["active", "completed", "closing"])
      .order("starts_at", { ascending: false })
      .limit(20);

    const nowMs = Date.now();
    const expiredActiveIds: string[] = [];

    const normalizedSessions = (allSessions ?? []).map((s) => {
      const isPastEnd = new Date(s.ends_at).getTime() <= nowMs;
      if ((s.status === "active" || s.status === "closing") && isPastEnd) {
        expiredActiveIds.push(s.id);
        return { ...s, status: "completed" as const };
      }
      return s;
    });

    if (expiredActiveIds.length > 0) {
      await supabase
        .from("game_sessions")
        .update({ status: "completed" })
        .in("id", expiredActiveIds);
      for (const expId of expiredActiveIds) {
        await recalculateSessionViaRpc(supabase, expId);
      }
    }

    const sessions = normalizedSessions.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
    });

    let targetSession = sessionId
      ? sessions.find((s) => s.id === sessionId) ?? null
      : preferCompleted
      ? sessions.find((s) => s.status === "completed") ?? sessions[0] ?? null
      : sessions.find((s) => s.status === "active") ?? sessions[0] ?? null;

    if (sessionId && !targetSession && isUuid(sessionId)) {
      const { data: fetchedSession } = await supabase
        .from("game_sessions")
        .select("id, name, status, starts_at, ends_at, prize_pool, prize_structure")
        .eq("id", sessionId)
        .maybeSingle();
      if (fetchedSession) {
        const isPastEnd = new Date(fetchedSession.ends_at).getTime() <= nowMs;
        if (
          (fetchedSession.status === "active" ||
            fetchedSession.status === "closing") &&
          isPastEnd
        ) {
          await supabase
            .from("game_sessions")
            .update({ status: "completed" })
            .eq("id", fetchedSession.id);
          await recalculateSessionViaRpc(supabase, fetchedSession.id);
          targetSession = { ...fetchedSession, status: "completed" };
        } else {
          targetSession = fetchedSession;
        }
      }
    }

    const targetSessionId = targetSession?.id ?? (isUuid(sessionId) ? sessionId : null);

    if (!targetSessionId) {
      return NextResponse.json({
        ok: true,
        sessions,
        session: null,
        totalGuesses: 0,
        leaderboard: [],
        questions: [],
      });
    }

    if (includeQuestions) {
      const { data: sqData } = await supabase
        .from("session_questions")
        .select(`
          position,
          question_id,
          questions (
            id,
            title,
            category,
            type,
            notes,
            question_options (
              id,
              label,
              media_url,
              position
            )
          )
        `)
        .eq("session_id", targetSessionId)
        .order("position", { ascending: true });

      const questions = (sqData ?? []).map((sq) => {
        const q = (Array.isArray(sq.questions) ? sq.questions[0] : sq.questions) as {
          id: string;
          title: string;
          category: string;
          type: string;
          question_options?: {
            id: string;
            label: string;
            media_url: string | null;
            position: number;
          }[];
        } | null;
        return {
          position: sq.position,
          question_id: sq.question_id,
          questions: q
            ? {
                ...q,
                question_options: [...(q.question_options ?? [])].sort(
                  (a, b) => a.position - b.position,
                ),
              }
            : null,
        };
      });

      return NextResponse.json({
        ok: true,
        sessionId: targetSessionId,
        session: targetSession,
        questions,
      });
    }

    const authUser = includeFeedback ? await getOptionalAuthUser(req) : null;
    const verifiedUserId = authUser?.id ?? null;

    // Verify ownership if entryIdParam is passed so another player's picks cannot be read
    let verifiedEntryId: string | null = null;
    if (includeFeedback && isUuid(entryIdParam) && verifiedUserId) {
      const { data: ownedEntry } = await supabase
        .from("session_entries")
        .select("id")
        .eq("id", entryIdParam)
        .eq("user_id", verifiedUserId)
        .maybeSingle();
      verifiedEntryId = ownedEntry?.id ?? null;
    }

    const [{ data: lbInitial }, { data: guessCountData }] = await Promise.all([
      supabase
        .from("leaderboards")
        .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
        .eq("session_id", targetSessionId)
        .order("rank", { ascending: true })
        .limit(100),
      supabase.rpc("get_session_guess_count", {
        p_session_id: targetSessionId,
      }),
    ]);

    let lb = lbInitial ?? [];
    const totalGuesses = Number(guessCountData ?? 0);

    // Self-heal if answers exist for a session whose leaderboard has not been populated yet
    if (lb.length === 0 && totalGuesses > 0) {
      await recalculateSessionViaRpc(supabase, targetSessionId);
      const { data: lbRefreshed } = await supabase
        .from("leaderboards")
        .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
        .eq("session_id", targetSessionId)
        .order("rank", { ascending: true })
        .limit(100);
      lb = lbRefreshed ?? [];
    }

    const normalizedLeaderboard = lb.map((row) => {
      const rawProf = row.profiles as
        | { username?: string | null; avatar_url?: string | null }
        | { username?: string | null; avatar_url?: string | null }[]
        | null
        | undefined;
      const prof = Array.isArray(rawProf) ? rawProf[0] ?? null : rawProf ?? null;
      return {
        ...row,
        profiles: prof
          ? {
              username: prof.username ?? "Player",
              avatar_url: prof.avatar_url ?? null,
            }
          : null,
      };
    });

    if (!includeFeedback) {
      return NextResponse.json({
        ok: true,
        sessionId: targetSessionId,
        session: targetSession,
        sessions,
        totalGuesses,
        leaderboard: normalizedLeaderboard,
      });
    }

    // Unlimited-scale SQL aggregation for Question-by-Question Crowd Feedback & Personal Picks
    const [{ data: sqFeedbackData }, { data: feedbackRpc }] = await Promise.all([
      supabase
        .from("session_questions")
        .select(`
          position,
          question_id,
          questions (
            id,
            title,
            category,
            type,
            notes,
            question_options (
              id,
              label,
              media_url,
              position
            )
          )
        `)
        .eq("session_id", targetSessionId)
        .order("position", { ascending: true }),
      supabase.rpc("get_session_feedback_summary", {
        p_session_id: targetSessionId,
        p_user_id: verifiedUserId,
        p_entry_id: verifiedEntryId,
      }),
    ]);

    const fbSummary = (feedbackRpc ?? {
      optionStats: [],
      totalPlays: 0,
      uniquePlayers: 0,
      totalGuesses: 0,
      avgQuestionMs: 0,
      myEntry: null,
      myPicks: [],
    }) as FeedbackSummaryRpcResult;

    const optCountMap = new Map<string, number>();
    const optTimeMap = new Map<string, number>();
    for (const stat of fbSummary.optionStats ?? []) {
      optCountMap.set(stat.optionId, Number(stat.selectionCount ?? 0));
      optTimeMap.set(stat.optionId, Number(stat.totalMs ?? 0));
    }

    const myPickByQuestion = new Map<
      string,
      { optionId: string; responseMs: number }
    >();
    for (const p of fbSummary.myPicks ?? []) {
      if (p.questionId && p.optionId) {
        myPickByQuestion.set(p.questionId, {
          optionId: p.optionId,
          responseMs: Number(p.responseMs ?? 0),
        });
      }
    }

    let mostSelectedHits = 0;
    let top3Hits = 0;

    const questionFeedbacks = (sqFeedbackData ?? []).map((sq) => {
      const q = (Array.isArray(sq.questions) ? sq.questions[0] : sq.questions) as {
        id: string;
        title: string;
        category: string;
        type: string;
        notes?: string | null;
        question_options?: {
          id: string;
          label: string;
          media_url: string | null;
          position: number;
        }[];
      } | null;

      const rawOptions = [...(q?.question_options ?? [])].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );

      const questionTotalSelections = rawOptions.reduce(
        (sum, o) => sum + (optCountMap.get(o.id) ?? 0),
        0,
      );
      const questionTotalMs = rawOptions.reduce(
        (sum, o) => sum + (optTimeMap.get(o.id) ?? 0),
        0,
      );

      const rankedOptions = [...rawOptions].sort((a, b) => {
        const aCount = optCountMap.get(a.id) ?? 0;
        const bCount = optCountMap.get(b.id) ?? 0;
        if (bCount !== aCount) return bCount - aCount;
        if (aCount > 0) {
          const timeDiff = (optTimeMap.get(a.id) ?? 0) - (optTimeMap.get(b.id) ?? 0);
          if (timeDiff !== 0) return timeDiff;
        }
        return (a.position ?? 0) - (b.position ?? 0);
      });

      const myPick = q ? myPickByQuestion.get(q.id) : undefined;
      let myPointsEarned: number | null = null;

      const options = rankedOptions.map((opt, idx) => {
        const rank = idx + 1;
        const points = Math.max(10 - idx, 1);
        const selectionCount = optCountMap.get(opt.id) ?? 0;
        const totalOptMs = optTimeMap.get(opt.id) ?? 0;
        const percentage =
          questionTotalSelections > 0
            ? Number(((selectionCount / questionTotalSelections) * 100).toFixed(1))
            : 0;
        const avgResponseMs =
          selectionCount > 0 ? Math.round(totalOptMs / selectionCount) : 0;
        const isMyPick = myPick?.optionId === opt.id;
        if (isMyPick) {
          myPointsEarned = points;
          if (rank === 1) mostSelectedHits += 1;
          if (rank <= 3) top3Hits += 1;
        }

        return {
          rank,
          optionId: opt.id,
          label: opt.label,
          mediaUrl: opt.media_url,
          position: opt.position,
          selectionCount,
          percentage,
          points,
          avgResponseMs,
          isMostSelected: rank === 1 && selectionCount > 0,
          isLeastSelected: rank === rankedOptions.length,
          isMyPick,
        };
      });

      return {
        position: sq.position,
        questionId: sq.question_id,
        title: q?.title || `Question ${sq.position}`,
        category: q?.category || "General",
        type: q?.type || "text",
        notes: q?.notes || null,
        totalSelections: questionTotalSelections,
        avgResponseMs:
          questionTotalSelections > 0
            ? Math.round(questionTotalMs / questionTotalSelections)
            : 0,
        mySelectedOptionId: myPick?.optionId ?? null,
        myResponseMs: myPick?.responseMs ?? null,
        myPointsEarned,
        options,
      };
    });

    const prizeStructure =
      Array.isArray(targetSession?.prize_structure) &&
      targetSession.prize_structure.length > 0
        ? (targetSession.prize_structure as {
            rank_from: number;
            rank_to: number;
            amount: number;
          }[])
        : DEFAULT_PRIZE_STRUCTURE;

    const totalWinners = Math.max(
      ...prizeStructure.map((t) => Number(t.rank_to ?? 0)),
      36,
    );

    const myEntry = fbSummary.myEntry;
    let myLbRow = lb.find(
      (r) =>
        (verifiedUserId && r.user_id === verifiedUserId) ||
        (myEntry && r.user_id === myEntry.user_id),
    );

    // If player ranks beyond Top 100, look up their exact leaderboard row directly
    if (!myLbRow && verifiedUserId) {
      const { data: exactLbRow } = await supabase
        .from("leaderboards")
        .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
        .eq("session_id", targetSessionId)
        .eq("user_id", verifiedUserId)
        .maybeSingle();
      if (exactLbRow) {
        myLbRow = exactLbRow;
      }
    }

    const myPerformance =
      myLbRow || myEntry
        ? {
            rank: myLbRow?.rank ?? myEntry?.final_rank ?? null,
            points: myLbRow?.points ?? myEntry?.total_score ?? 0,
            responseMs: myLbRow?.response_ms ?? myEntry?.total_response_ms ?? 0,
            prize: myLbRow?.prize ?? myEntry?.prize_awarded ?? 0,
            mostSelectedHits,
            top3Hits,
            questionsAnswered: myPickByQuestion.size,
          }
        : null;

    return NextResponse.json({
      ok: true,
      sessionId: targetSessionId,
      session: targetSession,
      sessions,
      totalGuesses: Number(fbSummary.totalGuesses ?? totalGuesses),
      leaderboard: normalizedLeaderboard,
      summary: {
        totalPlays: Number(fbSummary.totalPlays ?? 0),
        uniquePlayers: Math.max(
          Number(fbSummary.uniquePlayers ?? 0),
          normalizedLeaderboard.length,
        ),
        totalGuesses: Number(fbSummary.totalGuesses ?? totalGuesses),
        avgQuestionMs: Number(fbSummary.avgQuestionMs ?? 0),
        prizePool: Number(targetSession?.prize_pool ?? 500000),
        totalWinners,
      },
      myPerformance,
      questionFeedbacks,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load session leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseServiceClient();

    const auth = await requireAuthUser(req, body.userId);
    if (!auth.user) {
      return auth.response;
    }
    const userId = auth.user.id;

    if (action === "join") {
      const { sessionId, replay } = body;
      if (!isUuid(sessionId)) {
        return NextResponse.json(
          { error: "Valid sessionId is required" },
          { status: 400 },
        );
      }

      const [{ data: sessionRow }, { data: playerProfile }] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("id, name, status, ends_at")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("status")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (playerProfile && playerProfile.status !== "active") {
        return NextResponse.json(
          { error: "Your account is currently restricted from entering sessions." },
          { status: 403 },
        );
      }

      const isEnded =
        !sessionRow ||
        sessionRow.status !== "active" ||
        new Date(sessionRow.ends_at).getTime() <= Date.now();

      if (isEnded) {
        if (
          sessionRow &&
          sessionRow.status !== "completed" &&
          new Date(sessionRow.ends_at).getTime() <= Date.now()
        ) {
          await supabase
            .from("game_sessions")
            .update({ status: "completed" })
            .eq("id", sessionId);
          await recalculateSessionViaRpc(supabase, sessionId);
        }
        return NextResponse.json(
          {
            error: "This session has ended and is closed for play.",
            sessionEnded: true,
          },
          { status: 403 },
        );
      }

      const { data: existing } = await supabase
        .from("session_entries")
        .select("id, joined_at, completed_at, total_score, total_response_ms, final_rank")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      const { count: priorStarts } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("actor_id", userId)
        .eq("target_id", sessionId)
        .in("action", ["gameplay_start", "gameplay_replay"]);

      const attemptNumber = (priorStarts ?? (existing ? 1 : 0)) + 1;

      if (existing) {
        if (replay || existing.completed_at) {
          const { data: prevAnswers } = await supabase
            .from("answers")
            .select("question_id, option_id, response_ms")
            .eq("entry_id", existing.id);

          if ((prevAnswers && prevAnswers.length > 0) || existing.total_score !== null) {
            const prevTotalMs =
              prevAnswers && prevAnswers.length > 0
                ? prevAnswers.reduce((s, a) => s + (a.response_ms ?? 0), 0)
                : (existing.total_response_ms ?? 0);

            await supabase.from("audit_logs").insert({
              actor_id: userId,
              action: "gameplay_attempt_archived",
              target_table: "session_entries",
              target_id: sessionId,
              detail: {
                entry_id: existing.id,
                session_id: sessionId,
                attempt_number: Math.max(1, attemptNumber - 1),
                questions_answered: prevAnswers?.length ?? 10,
                total_score: existing.total_score ?? 0,
                total_response_ms: prevTotalMs,
                final_rank: existing.final_rank ?? null,
                started_at: existing.joined_at,
                completed_at: existing.completed_at ?? new Date().toISOString(),
                answers: prevAnswers ?? [],
              },
            });
          }

          await supabase.from("answers").delete().eq("entry_id", existing.id);
          await supabase
            .from("session_entries")
            .update({
              joined_at: new Date().toISOString(),
              completed_at: null,
            })
            .eq("id", existing.id);

          await supabase.from("audit_logs").insert({
            actor_id: userId,
            action: "gameplay_replay",
            target_table: "game_sessions",
            target_id: sessionId,
            detail: {
              entry_id: existing.id,
              session_id: sessionId,
              is_replay: true,
              attempt_number: attemptNumber,
            },
          });
        }
        return NextResponse.json({ ok: true, entryId: existing.id, attemptNumber });
      }

      const { data: created, error: createErr } = await supabase
        .from("session_entries")
        .insert({
          session_id: sessionId,
          user_id: userId,
        })
        .select("id")
        .single();

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      await supabase.from("audit_logs").insert({
        actor_id: userId,
        action: "gameplay_start",
        target_table: "game_sessions",
        target_id: sessionId,
        detail: {
          entry_id: created.id,
          session_id: sessionId,
          is_replay: false,
          attempt_number: 1,
        },
      });

      return NextResponse.json({ ok: true, entryId: created.id, attemptNumber: 1 });
    }

    if (action === "answer") {
      const { entryId, sessionId, questionId, optionId, responseMs } = body;
      if (
        !isUuid(entryId) ||
        !isUuid(sessionId) ||
        !isUuid(questionId) ||
        !isUuid(optionId)
      ) {
        return NextResponse.json({ error: "Missing or invalid answer fields" }, { status: 400 });
      }

      const [{ data: sessionRow }, { data: entryRow }] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("id, name, status, ends_at")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("session_entries")
          .select("id, user_id, session_id")
          .eq("id", entryId)
          .maybeSingle(),
      ]);

      if (!entryRow || entryRow.session_id !== sessionId) {
        return NextResponse.json({ error: "Session entry not found" }, { status: 404 });
      }
      if (entryRow.user_id !== userId) {
        return NextResponse.json(
          { error: "Forbidden: cannot submit answers for another player's entry." },
          { status: 403 },
        );
      }

      const isEnded =
        !sessionRow ||
        sessionRow.status !== "active" ||
        new Date(sessionRow.ends_at).getTime() <= Date.now();

      if (isEnded) {
        if (
          sessionRow &&
          sessionRow.status !== "completed" &&
          new Date(sessionRow.ends_at).getTime() <= Date.now()
        ) {
          await supabase
            .from("game_sessions")
            .update({ status: "completed" })
            .eq("id", sessionId);
          await recalculateSessionViaRpc(supabase, sessionId);
        }
        return NextResponse.json(
          {
            error: "This session has ended and is closed for play.",
            sessionEnded: true,
          },
          { status: 403 },
        );
      }

      // Verify option belongs to a question in this session
      const { data: validOpt } = await supabase
        .from("session_questions")
        .select("question_id, questions!inner(question_options!inner(id))")
        .eq("session_id", sessionId)
        .eq("question_id", questionId)
        .eq("questions.question_options.id", optionId)
        .maybeSingle();

      if (!validOpt) {
        return NextResponse.json(
          { error: "Invalid question or option for this session" },
          { status: 400 },
        );
      }

      const safeMs = Math.max(200, Math.min(Number(responseMs) || 2000, 600000));

      const { error: ansErr } = await supabase.from("answers").upsert(
        {
          entry_id: entryId,
          session_id: sessionId,
          question_id: questionId,
          option_id: optionId,
          response_ms: safeMs,
          is_locked_2x: false,
        },
        { onConflict: "entry_id,question_id" },
      );

      if (ansErr) {
        return NextResponse.json({ error: ansErr.message }, { status: 500 });
      }

      const [{ count: ansCount }, { count: qCount }] = await Promise.all([
        supabase
          .from("answers")
          .select("id", { count: "exact", head: true })
          .eq("entry_id", entryId),
        supabase
          .from("session_questions")
          .select("question_id", { count: "exact", head: true })
          .eq("session_id", sessionId),
      ]);

      const completed = (ansCount ?? 0) >= (qCount ?? 10);
      let myStats = null;

      if (completed) {
        await supabase
          .from("session_entries")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", entryId);
      }

      // Atomic Postgres RPC recalculation (scales beyond 1,000+ rows with zero truncation)
      const calcResult = await recalculateSessionViaRpc(supabase, sessionId, entryId);
      const mine = calcResult.myEntry;
      if (mine) {
        const isBestRetained =
          mine.points > mine.latestPoints ||
          (mine.points === mine.latestPoints &&
            mine.responseMs < mine.latestResponseMs);
        myStats = {
          rank: mine.rank,
          points: mine.points,
          responseMs: mine.responseMs,
          prize: mine.prize,
          latestPoints: mine.latestPoints,
          latestResponseMs: mine.latestResponseMs,
          attemptsCount: mine.attemptsCount,
          isBestRetained,
        };
      }

      await supabase.from("audit_logs").insert({
        actor_id: userId,
        action: "gameplay_answer",
        target_table: "answers",
        target_id: sessionId,
        detail: {
          entry_id: entryId,
          session_id: sessionId,
          question_id: questionId,
          option_id: optionId,
          response_ms: safeMs,
          questions_answered: ansCount ?? 1,
          completed,
          running_score: mine?.latestPoints ?? mine?.points ?? null,
          best_score: mine?.points ?? null,
          running_rank: mine?.rank ?? null,
        },
      });

      if (completed && mine) {
        await supabase.from("audit_logs").insert({
          actor_id: userId,
          action: "gameplay_complete",
          target_table: "game_sessions",
          target_id: sessionId,
          detail: {
            entry_id: entryId,
            session_id: sessionId,
            total_score: mine.latestPoints,
            total_response_ms: mine.latestResponseMs,
            best_score: mine.points,
            best_response_ms: mine.responseMs,
            final_rank: mine.rank,
            attempts_count: mine.attemptsCount,
          },
        });

        if (mine.rank <= 3 && !myStats?.isBestRetained) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("username, state, turf")
            .eq("id", userId)
            .maybeSingle();
          const uname = prof?.username || "Player";
          const rawLoc = (prof?.state || "").trim() || (prof?.turf || "").trim();
          const st = rawLoc.replace(/\s*\(.*?\)\s*/g, "").trim() || "Nigeria";
          const secs = Math.max(1, Math.round(mine.responseMs / 1000));
          const timeStr = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
          const noticeBody = `${uname} (${st}) moved into #${mine.rank} on ${sessionRow.name} with ${mine.points} pts in ${timeStr}`;

          const { data: existingNotice } = await supabase
            .from("community_messages")
            .select("id")
            .eq("room", "live_arena")
            .eq("session_id", sessionId)
            .eq("is_system", true)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingNotice?.id) {
            await supabase
              .from("community_messages")
              .update({
                body: noticeBody,
                author_username: uname,
                author_state: st,
                author_rank: mine.rank,
                created_at: new Date().toISOString(),
              })
              .eq("id", existingNotice.id);
          } else {
            await supabase.from("community_messages").insert({
              room: "live_arena",
              session_id: sessionId,
              user_id: userId,
              is_system: true,
              body: noticeBody,
              author_username: uname,
              author_state: st,
              author_rank: mine.rank,
            });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        completed,
        myStats,
      });
    }

    if (action === "recalculate") {
      const { sessionId } = body;
      if (!isUuid(sessionId)) {
        return NextResponse.json(
          { error: "Valid sessionId is required" },
          { status: 400 },
        );
      }
      const res = await recalculateSessionViaRpc(supabase, sessionId);
      return NextResponse.json({ ok: true, count: res.totalPlayers });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
