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

async function recalculateLiveLeaderboard(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  sessionId: string,
) {
  const [{ data: session }, { data: sqs }, { data: allAnswers }, { data: entries }] =
    await Promise.all([
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
        .select("id, user_id, completed_at")
        .eq("session_id", sessionId),
    ]);

  if (!entries || entries.length === 0 || !allAnswers) return [];

  // Build option pick counts per question
  const countsByQuestion: Record<string, Record<string, number>> = {};
  if (sqs) {
    for (const sq of sqs) {
      countsByQuestion[sq.question_id] = {};
      const qObj = Array.isArray(sq.question_options)
        ? sq.question_options[0]
        : sq.question_options;
      const opts = (qObj as { question_options?: { id: string; position: number }[] })
        ?.question_options ?? [];
      for (const o of opts) {
        countsByQuestion[sq.question_id][o.id] = 0;
      }
    }
  }

  for (const ans of allAnswers) {
    if (!countsByQuestion[ans.question_id]) {
      countsByQuestion[ans.question_id] = {};
    }
    countsByQuestion[ans.question_id][ans.option_id] =
      (countsByQuestion[ans.question_id][ans.option_id] ?? 0) + 1;
  }

  // Assign points per option: Most selected = 10 pts, 2nd = 9 pts ... Least selected = 1 pt (Page 18)
  const pointsByOption: Record<string, number> = {};
  for (const qId of Object.keys(countsByQuestion)) {
    const optMap = countsByQuestion[qId];
    const sorted = Object.entries(optMap).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([optId], idx) => {
      pointsByOption[optId] = Math.max(10 - idx, 1);
    });
  }

  // Group answers by entry_id
  const answersByEntry: Record<string, { option_id: string; response_ms: number }[]> = {};
  for (const ans of allAnswers) {
    if (!answersByEntry[ans.entry_id]) answersByEntry[ans.entry_id] = [];
    answersByEntry[ans.entry_id].push(ans);
  }

  // Compute score and cumulative time for each entry that has answers
  const scoredEntries: {
    entryId: string;
    userId: string;
    points: number;
    responseMs: number;
  }[] = [];

  for (const entry of entries) {
    const entryAnswers = answersByEntry[entry.id] ?? [];
    if (entryAnswers.length === 0) continue;
    const points = entryAnswers.reduce(
      (sum, a) => sum + (pointsByOption[a.option_id] ?? 1),
      0,
    );
    const responseMs = entryAnswers.reduce((sum, a) => sum + (a.response_ms ?? 0), 0);
    scoredEntries.push({
      entryId: entry.id,
      userId: entry.user_id,
      points,
      responseMs,
    });
  }

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
    };
  });

  // Persist to session_entries and leaderboards
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
      leaderboardRows.map(({ entryId: _unused, ...rest }) => {
        void _unused;
        return rest;
      }),
    );
  }

  return leaderboardRows;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const supabase = createSupabaseServiceClient();

    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const { data: active } = await supabase
        .from("game_sessions")
        .select("id")
        .eq("status", "active")
        .order("ends_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetSessionId = active?.id ?? null;
    }

    if (!targetSessionId) {
      return NextResponse.json({ ok: true, totalGuesses: 0, leaderboard: [] });
    }

    await recalculateLiveLeaderboard(supabase, targetSessionId);

    const [{ data: lb }, { count: entryCount }] = await Promise.all([
      supabase
        .from("leaderboards")
        .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
        .eq("session_id", targetSessionId)
        .order("rank", { ascending: true })
        .limit(100),
      supabase
        .from("session_entries")
        .select("id", { count: "exact", head: true })
        .eq("session_id", targetSessionId),
    ]);

    return NextResponse.json({
      ok: true,
      sessionId: targetSessionId,
      totalGuesses: entryCount ?? lb?.length ?? 0,
      leaderboard: lb ?? [],
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

      const { data: existing } = await supabase
        .from("session_entries")
        .select("id, completed_at")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        if (replay || existing.completed_at) {
          // Reset previous attempt so user can play again ("Try again if you don't make it", Page 6)
          await supabase.from("answers").delete().eq("entry_id", existing.id);
          await supabase
            .from("session_entries")
            .update({
              completed_at: null,
              total_score: null,
              total_response_ms: null,
              final_rank: null,
            })
            .eq("id", existing.id);
        }
        return NextResponse.json({ ok: true, entryId: existing.id });
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

      return NextResponse.json({ ok: true, entryId: created.id });
    }

    if (action === "answer") {
      const { entryId, sessionId, questionId, optionId, responseMs } = body;
      if (!entryId || !sessionId || !questionId || !optionId) {
        return NextResponse.json({ error: "Missing answer fields" }, { status: 400 });
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

      // Always recalculate live scores so the leaderboard reflects every guess immediately (Page 19)
      const lbRows = await recalculateLiveLeaderboard(supabase, sessionId);
      const mine = lbRows.find((r) => r.entryId === entryId);
      if (mine) {
        myStats = {
          rank: mine.rank,
          points: mine.points,
          responseMs: mine.response_ms,
          prize: mine.prize,
        };
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
