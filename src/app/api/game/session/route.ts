import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const DEFAULT_PRIZE_STRUCTURE = [
  { rank_from: 1, rank_to: 1, amount: 100000 },
  { rank_from: 2, rank_to: 2, amount: 50000 },
  { rank_from: 3, rank_to: 3, amount: 20000 },
  { rank_from: 4, rank_to: 36, amount: 10000 },
];

function getPrizeForRank(
  rank: number,
  structure: { rank_from: number; rank_to: number; amount: number }[],
): number {
  const tiers = structure && structure.length > 0 ? structure : DEFAULT_PRIZE_STRUCTURE;
  for (const tier of tiers) {
    if (rank >= tier.rank_from && rank <= tier.rank_to) {
      return Number(tier.amount);
    }
  }
  return 0;
}

type ArchivedAttemptDetail = {
  entry_id?: string;
  session_id?: string;
  attempt_number?: number;
  questions_answered?: number;
  total_score?: number;
  total_response_ms?: number;
  final_rank?: number | null;
  answers?: { question_id: string; option_id: string; response_ms: number }[];
};

async function recalculateLiveLeaderboard(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  sessionId: string,
) {
  const [
    { data: session },
    { data: sqs },
    { data: allAnswers },
    { data: entries },
    { data: archivedLogs },
  ] = await Promise.all([
    supabase.from("game_sessions").select("prize_structure").eq("id", sessionId).maybeSingle(),
    supabase
      .from("session_questions")
      .select("question_id, question_options:questions(question_options(id, position))")
      .eq("session_id", sessionId),
    supabase
      .from("answers")
      .select("entry_id, question_id, option_id, response_ms")
      .eq("session_id", sessionId),
    supabase
      .from("session_entries")
      .select("id, user_id, completed_at, total_score, total_response_ms")
      .eq("session_id", sessionId),
    supabase
      .from("audit_logs")
      .select("actor_id, detail")
      .eq("target_id", sessionId)
      .eq("action", "gameplay_attempt_archived"),
  ]);

  if (!entries || entries.length === 0) return [];

  // Build option pick counts per question (active answers + archived replay answers)
  const countsByQuestion: Record<string, Record<string, number>> = {};
  const timeByOption: Record<string, number> = {};
  const positionByOption: Record<string, number> = {};

  if (sqs) {
    for (const sq of sqs) {
      countsByQuestion[sq.question_id] = {};
      const qObj = Array.isArray(sq.question_options)
        ? sq.question_options[0]
        : sq.question_options;
      const opts =
        (qObj as { question_options?: { id: string; position: number }[] })?.question_options ?? [];
      for (const o of opts) {
        countsByQuestion[sq.question_id][o.id] = 0;
        timeByOption[o.id] = 0;
        positionByOption[o.id] = o.position ?? 0;
      }
    }
  }

  for (const ans of allAnswers ?? []) {
    if (!countsByQuestion[ans.question_id]) {
      countsByQuestion[ans.question_id] = {};
    }
    countsByQuestion[ans.question_id][ans.option_id] =
      (countsByQuestion[ans.question_id][ans.option_id] ?? 0) + 1;
    timeByOption[ans.option_id] =
      (timeByOption[ans.option_id] ?? 0) + Number(ans.response_ms ?? 0);
  }

  for (const log of archivedLogs ?? []) {
    const detail = (log.detail ?? {}) as ArchivedAttemptDetail;
    if (Array.isArray(detail.answers)) {
      for (const ans of detail.answers) {
        if (!ans.question_id || !ans.option_id) continue;
        if (!countsByQuestion[ans.question_id]) {
          countsByQuestion[ans.question_id] = {};
        }
        countsByQuestion[ans.question_id][ans.option_id] =
          (countsByQuestion[ans.question_id][ans.option_id] ?? 0) + 1;
        timeByOption[ans.option_id] =
          (timeByOption[ans.option_id] ?? 0) + Number(ans.response_ms ?? 0);
      }
    }
  }

  // Assign points per option: Most selected = 10 pts, 2nd = 9 pts ... Least selected = 1 pt (Page 18)
  // If there is a draw in vote count, fastest response time gets more points
  const pointsByOption: Record<string, number> = {};
  for (const qId of Object.keys(countsByQuestion)) {
    const optMap = countsByQuestion[qId];
    const sorted = Object.entries(optMap).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      if (a[1] > 0) {
        const timeDiff = (timeByOption[a[0]] ?? 0) - (timeByOption[b[0]] ?? 0);
        if (timeDiff !== 0) return timeDiff;
      }
      return (positionByOption[a[0]] ?? 0) - (positionByOption[b[0]] ?? 0);
    });
    sorted.forEach(([optId], idx) => {
      pointsByOption[optId] = Math.max(10 - idx, 1);
    });
  }

  // Group current answers by entry_id
  const answersByEntry: Record<
    string,
    { question_id: string; option_id: string; response_ms: number }[]
  > = {};
  for (const ans of allAnswers ?? []) {
    if (!answersByEntry[ans.entry_id]) answersByEntry[ans.entry_id] = [];
    answersByEntry[ans.entry_id].push(ans);
  }

  // Compute each player's BEST SCORE across all attempts (current + archived + stored)
  const scoredEntries: {
    entryId: string;
    userId: string;
    points: number;
    responseMs: number;
    latestPoints: number;
    latestResponseMs: number;
    attemptsCount: number;
  }[] = [];

  for (const entry of entries) {
    const currentAnswers = answersByEntry[entry.id] ?? [];
    const currentPoints = currentAnswers.reduce(
      (sum, a) => sum + (pointsByOption[a.option_id] ?? 1),
      0,
    );
    const currentResponseMs = currentAnswers.reduce(
      (sum, a) => sum + Number(a.response_ms ?? 0),
      0,
    );

    const myArchived = (archivedLogs ?? []).filter((l) => {
      const d = (l.detail ?? {}) as ArchivedAttemptDetail;
      return d.entry_id === entry.id || l.actor_id === entry.user_id;
    });

    const candidates: {
      points: number;
      responseMs: number;
      source: "archived" | "stored" | "current";
    }[] = [];

    for (const arch of myArchived) {
      const detail = (arch.detail ?? {}) as ArchivedAttemptDetail;
      const archAns = Array.isArray(detail.answers) ? detail.answers : [];
      const dynPts =
        archAns.length > 0
          ? archAns.reduce((s, a) => s + (pointsByOption[a.option_id] ?? 1), 0)
          : 0;
      const dynMs =
        archAns.length > 0
          ? archAns.reduce((s, a) => s + Number(a.response_ms ?? 0), 0)
          : 0;
      // Always use live dynamic crowd-consensus points when option selections exist so scores move up OR down as votes change
      const pts = archAns.length > 0 ? dynPts : Number(detail.total_score ?? 0);
      const ms = Number(detail.total_response_ms || dynMs || 0);
      if (pts > 0) {
        candidates.push({ points: pts, responseMs: ms, source: "archived" });
      }
    }

    if (
      currentAnswers.length === 0 &&
      myArchived.length === 0 &&
      entry.total_score !== null &&
      Number(entry.total_score) > 0
    ) {
      candidates.push({
        points: Number(entry.total_score),
        responseMs: Number(entry.total_response_ms ?? 0),
        source: "stored",
      });
    }

    if (currentAnswers.length > 0) {
      candidates.push({
        points: currentPoints,
        responseMs: currentResponseMs,
        source: "current",
      });
    }

    if (candidates.length === 0) continue;

    // Pick BEST candidate: highest points first, then shortest responseMs
    candidates.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.responseMs - b.responseMs;
    });

    const best = candidates[0];

    scoredEntries.push({
      entryId: entry.id,
      userId: entry.user_id,
      points: best.points,
      responseMs: best.responseMs,
      latestPoints: currentAnswers.length > 0 ? currentPoints : best.points,
      latestResponseMs: currentAnswers.length > 0 ? currentResponseMs : best.responseMs,
      attemptsCount: myArchived.length + (currentAnswers.length > 0 ? 1 : 0),
    });
  }

  if (scoredEntries.length === 0) return [];

  // Sort by highest points, then shortest cumulative time (Page 5 & 18)
  scoredEntries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.responseMs - b.responseMs;
  });

  const prizeStructure =
    (session?.prize_structure as { rank_from: number; rank_to: number; amount: number }[]) ??
    DEFAULT_PRIZE_STRUCTURE;

  const leaderboardRows = scoredEntries.map((item, idx) => {
    const rank = idx + 1;
    const prize = getPrizeForRank(rank, prizeStructure);
    return {
      session_id: sessionId,
      user_id: item.userId,
      rank,
      points: item.points,
      response_ms: item.responseMs,
      prize,
      entryId: item.entryId,
      latestPoints: item.latestPoints,
      latestResponseMs: item.latestResponseMs,
      attemptsCount: item.attemptsCount,
    };
  });

  // Persist Best Score to session_entries and leaderboards
  await Promise.all(
    leaderboardRows.map((row) =>
      supabase
        .from("session_entries")
        .update({
          total_score: row.points,
          total_response_ms: row.response_ms,
          final_rank: row.rank,
          prize_awarded: row.prize,
        })
        .eq("id", row.entryId),
    ),
  );

  await supabase.from("leaderboards").delete().eq("session_id", sessionId);
  if (leaderboardRows.length > 0) {
    await supabase.from("leaderboards").insert(
      leaderboardRows.map(
        ({
          entryId: _e,
          latestPoints: _lp,
          latestResponseMs: _lm,
          attemptsCount: _ac,
          ...rest
        }) => {
          void _e;
          void _lp;
          void _lm;
          void _ac;
          return rest;
        },
      ),
    );
  }

  return leaderboardRows;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const includeQuestions = searchParams.get("includeQuestions") === "1";
    const includeFeedback = searchParams.get("includeFeedback") === "1";
    const preferCompleted = searchParams.get("preferCompleted") === "1";
    const userIdParam = searchParams.get("userId") || "";
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
        await recalculateLiveLeaderboard(supabase, expId);
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

    if (sessionId && !targetSession) {
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
          targetSession = { ...fetchedSession, status: "completed" };
        } else {
          targetSession = fetchedSession;
        }
      }
    }

    const targetSessionId = targetSession?.id ?? sessionId ?? null;

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
          question_options?: { id: string; label: string; media_url: string | null; position: number }[];
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

    await recalculateLiveLeaderboard(supabase, targetSessionId);

    const [
      { data: lb },
      { count: answerCount },
      { data: archivedLogs },
      { data: sqFeedbackData },
      { data: allSessionAnswers },
      { data: allSessionEntries },
    ] = await Promise.all([
      supabase
        .from("leaderboards")
        .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
        .eq("session_id", targetSessionId)
        .order("rank", { ascending: true })
        .limit(100),
      supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("session_id", targetSessionId),
      supabase
        .from("audit_logs")
        .select("actor_id, detail")
        .eq("target_id", targetSessionId)
        .eq("action", "gameplay_attempt_archived"),
      includeFeedback
        ? supabase
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
            .order("position", { ascending: true })
        : Promise.resolve({ data: null }),
      includeFeedback
        ? supabase
            .from("answers")
            .select("entry_id, question_id, option_id, response_ms")
            .eq("session_id", targetSessionId)
        : Promise.resolve({ data: null }),
      includeFeedback
        ? supabase
            .from("session_entries")
            .select("id, user_id, completed_at, total_score, total_response_ms, final_rank, prize_awarded")
            .eq("session_id", targetSessionId)
        : Promise.resolve({ data: null }),
    ]);

    const archivedAnswersCount = (archivedLogs ?? []).reduce((sum, l) => {
      const detail = (l.detail ?? {}) as ArchivedAttemptDetail;
      if (Array.isArray(detail.answers)) return sum + detail.answers.length;
      return sum + Number(detail.questions_answered ?? 0);
    }, 0);

    const totalGuesses = (answerCount ?? 0) + archivedAnswersCount;

    if (!includeFeedback) {
      return NextResponse.json({
        ok: true,
        sessionId: targetSessionId,
        session: targetSession,
        sessions,
        totalGuesses,
        leaderboard: lb ?? [],
      });
    }

    // Build detailed Question-by-Question Crowd Feedback & Personal Pick Analysis
    const optCountMap = new Map<string, number>();
    const optTimeMap = new Map<string, number>();
    let totalAllAnswersMs = 0;
    let totalAllAnswersCount = 0;

    for (const ans of allSessionAnswers ?? []) {
      optCountMap.set(ans.option_id, (optCountMap.get(ans.option_id) ?? 0) + 1);
      const ms = Number(ans.response_ms ?? 0);
      optTimeMap.set(ans.option_id, (optTimeMap.get(ans.option_id) ?? 0) + ms);
      totalAllAnswersMs += ms;
      totalAllAnswersCount += 1;
    }

    for (const log of archivedLogs ?? []) {
      const detail = (log.detail ?? {}) as ArchivedAttemptDetail;
      if (Array.isArray(detail.answers)) {
        for (const ans of detail.answers) {
          if (!ans.option_id) continue;
          optCountMap.set(ans.option_id, (optCountMap.get(ans.option_id) ?? 0) + 1);
          const ms = Number(ans.response_ms ?? 0);
          optTimeMap.set(ans.option_id, (optTimeMap.get(ans.option_id) ?? 0) + ms);
          totalAllAnswersMs += ms;
          totalAllAnswersCount += 1;
        }
      }
    }

    // Determine the user's own picks (from current entry or best archived attempt)
    const myEntry = (allSessionEntries ?? []).find(
      (e) =>
        (entryIdParam && e.id === entryIdParam) ||
        (userIdParam && e.user_id === userIdParam),
    );
    const myPickByQuestion = new Map<string, { optionId: string; responseMs: number }>();

    if (myEntry) {
      const myCurrentAns = (allSessionAnswers ?? []).filter((a) => a.entry_id === myEntry.id);
      if (myCurrentAns.length > 0) {
        for (const a of myCurrentAns) {
          myPickByQuestion.set(a.question_id, {
            optionId: a.option_id,
            responseMs: Number(a.response_ms ?? 0),
          });
        }
      } else {
        const myArchLogs = (archivedLogs ?? []).filter((l) => {
          const d = (l.detail ?? {}) as ArchivedAttemptDetail;
          return d.entry_id === myEntry.id || l.actor_id === myEntry.user_id;
        });
        if (myArchLogs.length > 0) {
          const latestArch = myArchLogs[myArchLogs.length - 1];
          const detail = (latestArch.detail ?? {}) as ArchivedAttemptDetail;
          for (const a of detail.answers ?? []) {
            if (a.question_id && a.option_id) {
              myPickByQuestion.set(a.question_id, {
                optionId: a.option_id,
                responseMs: Number(a.response_ms ?? 0),
              });
            }
          }
        }
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

      // Sort by selection count descending; if there is a draw, fastest time gets more points
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

    const uniquePlayers = new Set(
      (allSessionEntries ?? []).map((e) => e.user_id),
    ).size;

    const myLbRow = (lb ?? []).find(
      (r) =>
        (userIdParam && r.user_id === userIdParam) ||
        (myEntry && r.user_id === myEntry.user_id),
    );

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
      totalGuesses,
      leaderboard: lb ?? [],
      summary: {
        totalPlays: (allSessionEntries?.length ?? 0) + (archivedLogs?.length ?? 0),
        uniquePlayers: Math.max(uniquePlayers, (lb ?? []).length),
        totalGuesses,
        avgQuestionMs:
          totalAllAnswersCount > 0
            ? Math.round(totalAllAnswersMs / totalAllAnswersCount)
            : 0,
        prizePool: Number(targetSession?.prize_pool ?? 500000),
        totalWinners,
      },
      myPerformance,
      questionFeedbacks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load session leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseServiceClient();

    if (action === "join") {
      const { sessionId, userId, replay } = body;
      if (!sessionId || !userId) {
        return NextResponse.json({ error: "sessionId and userId required" }, { status: 400 });
      }

      const { data: sessionRow } = await supabase
        .from("game_sessions")
        .select("id, name, status, ends_at")
        .eq("id", sessionId)
        .maybeSingle();

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
          await recalculateLiveLeaderboard(supabase, sessionId);
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

      // Count prior play starts/replays for this user in this session
      const { count: priorStarts } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("actor_id", userId)
        .eq("target_id", sessionId)
        .in("action", ["gameplay_start", "gameplay_replay"]);

      const attemptNumber = (priorStarts ?? (existing ? 1 : 0)) + 1;

      if (existing) {
        if (replay || existing.completed_at) {
          // Archive previous attempt (including its answers) before resetting so Best Score & crowd tallies are preserved
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

          // Clear current answers for the new run while retaining total_score & total_response_ms (Best Score)
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
      if (!entryId || !sessionId || !questionId || !optionId) {
        return NextResponse.json({ error: "Missing answer fields" }, { status: 400 });
      }

      const { data: sessionRow } = await supabase
        .from("game_sessions")
        .select("id, name, status, ends_at")
        .eq("id", sessionId)
        .maybeSingle();

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
          await recalculateLiveLeaderboard(supabase, sessionId);
        }
        return NextResponse.json(
          {
            error: "This session has ended and is closed for play.",
            sessionEnded: true,
          },
          { status: 403 },
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

      const [{ count: ansCount }, { count: qCount }, { data: entryRow }] = await Promise.all([
        supabase
          .from("answers")
          .select("id", { count: "exact", head: true })
          .eq("entry_id", entryId),
        supabase
          .from("session_questions")
          .select("question_id", { count: "exact", head: true })
          .eq("session_id", sessionId),
        supabase
          .from("session_entries")
          .select("user_id")
          .eq("id", entryId)
          .maybeSingle(),
      ]);

      const completed = (ansCount ?? 0) >= (qCount ?? 10);
      let myStats = null;

      if (completed) {
        await supabase
          .from("session_entries")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", entryId);
      }

      // Always recalculate live Best Scores so the leaderboard reflects every guess immediately (Page 19)
      const lbRows = await recalculateLiveLeaderboard(supabase, sessionId);
      const mine = lbRows.find((r) => r.entryId === entryId);
      if (mine) {
        const isBestRetained =
          mine.points > mine.latestPoints ||
          (mine.points === mine.latestPoints && mine.response_ms < mine.latestResponseMs);
        myStats = {
          rank: mine.rank,
          points: mine.points,
          responseMs: mine.response_ms,
          prize: mine.prize,
          latestPoints: mine.latestPoints,
          latestResponseMs: mine.latestResponseMs,
          attemptsCount: mine.attemptsCount,
          isBestRetained,
        };
      }

      // Record real-time answer & completion telemetry for Admin Gameplay Monitoring
      if (entryRow?.user_id) {
        await supabase.from("audit_logs").insert({
          actor_id: entryRow.user_id,
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
            actor_id: entryRow.user_id,
            action: "gameplay_complete",
            target_table: "game_sessions",
            target_id: sessionId,
            detail: {
              entry_id: entryId,
              session_id: sessionId,
              total_score: mine.latestPoints,
              total_response_ms: mine.latestResponseMs,
              best_score: mine.points,
              best_response_ms: mine.response_ms,
              final_rank: mine.rank,
              attempts_count: mine.attemptsCount,
            },
          });

          if (mine.rank <= 3) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("username, state, turf")
              .eq("id", entryRow.user_id)
              .maybeSingle();
            const uname = prof?.username || "A sharp player";
            const st =
              (prof?.state || "").trim() ||
              (prof?.turf || "").replace(/\s*\(.*?\)\s*/g, "").trim() ||
              "Nigeria";
            const secs = Math.max(1, Math.round(mine.response_ms / 1000));
            const timeStr = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
            await supabase.from("community_messages").insert({
              room: "live_arena",
              session_id: sessionId,
              is_system: true,
              body: `${uname} (${st}) just moved into #${mine.rank} on ${sessionRow.name} with ${mine.points} pts in ${timeStr}!`,
              author_username: "Arena Live",
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
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId required" }, { status: 400 });
      }
      const rows = await recalculateLiveLeaderboard(supabase, sessionId);
      return NextResponse.json({ ok: true, count: rows.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
