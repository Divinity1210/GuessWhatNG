import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const URL_REGEX =
  /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|ng|net|org|io|me|ly|co|gg|xyz)\b|wa\.me|t\.me)/i;
const PHONE_REGEX = /(\+?234\s?\d{9,10}|\b0[789][01]\d[\s-]?\d{3}[\s-]?\d{4}\b)/;

function cleanStateName(rawState?: string | null, rawTurf?: string | null): string {
  const s = (rawState || "").trim();
  if (s && s.toLowerCase() !== "unspecified") return s;
  const t = (rawTurf || "").trim();
  if (!t) return "Nigeria";
  // e.g. "Lagos (Eko)" -> "Lagos"
  return t.replace(/\s*\(.*?\)\s*/g, "").trim() || "Nigeria";
}

function validateCleanBanter(text: string, maxLen = 500): { ok: boolean; error?: string; cleaned: string } {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return { ok: false, error: "Write a message before posting.", cleaned: "" };
  }
  if (cleaned.length > maxLen) {
    return {
      ok: false,
      error: `Keep your message under ${maxLen} characters.`,
      cleaned,
    };
  }
  if (URL_REGEX.test(cleaned)) {
    return {
      ok: false,
      error: "External links and web addresses are blocked in the Arena.",
      cleaned,
    };
  }
  if (PHONE_REGEX.test(cleaned)) {
    return {
      ok: false,
      error: "Phone numbers and WhatsApp contacts are blocked for player safety.",
      cleaned,
    };
  }
  return { ok: true, cleaned };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const postId = searchParams.get("postId") || "";
    const category = searchParams.get("category") || "all";
    const searchUsers = (searchParams.get("searchUsers") || "").trim();

    if (searchUsers) {
      const safeQuery = searchUsers.replace(/[^a-zA-Z0-9_]/g, "");
      if (!safeQuery) {
        return NextResponse.json({ ok: true, users: [] });
      }
      const { data: matched } = await supabase
        .from("profiles")
        .select("id, username, state, turf")
        .ilike("username", `%${safeQuery}%`)
        .order("username", { ascending: true })
        .limit(12);

      const lowerQ = safeQuery.toLowerCase();
      const sorted = [...(matched ?? [])].sort((a, b) => {
        const aStarts = (a.username || "").toLowerCase().startsWith(lowerQ) ? 0 : 1;
        const bStarts = (b.username || "").toLowerCase().startsWith(lowerQ) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return (a.username || "").localeCompare(b.username || "");
      });

      return NextResponse.json({
        ok: true,
        users: sorted.slice(0, 8).map((u) => ({
          id: u.id,
          username: u.username,
          state: cleanStateName(u.state, u.turf),
          rank: null,
        })),
      });
    }

    // 1. Find current active session & latest completed session
    const { data: sessions } = await supabase
      .from("game_sessions")
      .select("id, name, status, ends_at")
      .in("status", ["active", "completed"])
      .order("starts_at", { ascending: false })
      .limit(10);

    const nowMs = Date.now();
    const activeSession =
      (sessions ?? []).find(
        (s) => s.status === "active" && new Date(s.ends_at).getTime() > nowMs,
      ) ?? null;
    const latestCompleted =
      (sessions ?? []).find(
        (s) => s.status === "completed" || new Date(s.ends_at).getTime() <= nowMs,
      ) ?? null;

    // Auto-ensure a Verdict Thread exists for the latest completed session so post-game banter is always live
    if (latestCompleted) {
      const { data: existingVerdict } = await supabase
        .from("community_posts")
        .select("id")
        .eq("session_id", latestCompleted.id)
        .eq("kind", "verdict")
        .maybeSingle();

      if (!existingVerdict) {
        await supabase.from("community_posts").insert({
          session_id: latestCompleted.id,
          kind: "verdict",
          category: "Session Verdict",
          title: `${latestCompleted.name} — Official Results & Crowd Verdict`,
          body: `The clock is up on ${latestCompleted.name}! Which question surprised you the most, and who called the crowd sharpest?`,
          is_pinned: false,
        });
      }
    }

    const rankSessionId = activeSession?.id ?? latestCompleted?.id ?? null;

    const [
      { data: lbRows },
      { data: liveMessages, error: liveMsgErr },
      { data: posts, error: postsErr },
      { data: pollVotes },
      { data: threadMessages },
      { data: ads },
      { data: myProfile },
    ] = await Promise.all([
      rankSessionId
        ? supabase
            .from("leaderboards")
            .select("user_id, rank, points")
            .eq("session_id", rankSessionId)
        : Promise.resolve({ data: [] as { user_id: string; rank: number; points: number }[] }),
      supabase
        .from("community_messages")
        .select(
          "id, room, session_id, user_id, is_system, body, author_username, author_state, author_rank, reactions, created_at",
        )
        .eq("room", "live_arena")
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("community_posts")
        .select("*")
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("community_poll_votes")
        .select("post_id, user_id, option_id"),
      postId
        ? supabase
            .from("community_messages")
            .select(
              "id, post_id, user_id, is_system, body, author_username, author_state, author_rank, reactions, created_at",
            )
            .eq("post_id", postId)
            .eq("status", "visible")
            .order("created_at", { ascending: true })
            .limit(200)
        : supabase
            .from("community_messages")
            .select(
              "id, post_id, user_id, is_system, body, author_username, author_state, author_rank, reactions, created_at",
            )
            .eq("room", "thread")
            .eq("status", "visible")
            .order("created_at", { ascending: true })
            .limit(400),
      supabase
        .from("community_ads")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false }),
      userId
        ? supabase
            .from("profiles")
            .select("id, username, state, turf, gender, date_of_birth")
            .eq("id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (postsErr || liveMsgErr) {
      return NextResponse.json(
        {
          ok: false,
          error: postsErr?.message || liveMsgErr?.message || "Temporary database error",
        },
        { status: 503 },
      );
    }

    const rankByUser = new Map<string, { rank: number; points: number }>();
    for (const r of lbRows ?? []) {
      rankByUser.set(r.user_id, { rank: r.rank, points: r.points });
    }

    // Fetch live state/username for message & post authors + top leaderboard players so badges & @mentions stay current
    const authorIds = new Set<string>();
    for (const m of liveMessages ?? []) if (m.user_id) authorIds.add(m.user_id);
    for (const m of threadMessages ?? []) if (m.user_id) authorIds.add(m.user_id);
    for (const p of posts ?? []) if (p.author_id) authorIds.add(p.author_id);
    for (const lb of (lbRows ?? []).slice(0, 40)) if (lb.user_id) authorIds.add(lb.user_id);

    const profileLookup = new Map<
      string,
      { username: string; state: string }
    >();
    if (authorIds.size > 0) {
      const { data: authorProfiles } = await supabase
        .from("profiles")
        .select("id, username, state, turf")
        .in("id", Array.from(authorIds));
      for (const ap of authorProfiles ?? []) {
        profileLookup.set(ap.id, {
          username: ap.username,
          state: cleanStateName(ap.state, ap.turf),
        });
      }
    }

    // Format Live Arena Chat messages (chronological: oldest -> newest)
    const enrichedLiveChat = [...(liveMessages ?? [])]
      .reverse()
      .map((m) => {
        const prof = m.user_id ? profileLookup.get(m.user_id) : undefined;
        const lb = m.user_id ? rankByUser.get(m.user_id) : undefined;
        return {
          id: m.id,
          userId: m.user_id,
          isSystem: m.is_system,
          body: m.body,
          username: prof?.username || m.author_username || "Player",
          state: prof?.state || m.author_state || "Nigeria",
          rank: lb?.rank ?? m.author_rank ?? null,
          points: lb?.points ?? null,
          reactions: (m.reactions ?? {}) as Record<string, number>,
          createdAt: m.created_at,
        };
      });

    // Compute active states count from live chat + thread replies for city rivalry strip
    const stateActivityCounts: Record<string, number> = {};
    for (const m of enrichedLiveChat) {
      if (!m.isSystem && m.state && m.state !== "Nigeria") {
        stateActivityCounts[m.state] = (stateActivityCounts[m.state] ?? 0) + 1;
      }
    }

    // Group poll votes & thread replies by post_id
    const votesByPost = new Map<string, Record<string, number>>();
    const totalVotesByPost = new Map<string, number>();
    const myVoteByPost = new Map<string, string>();

    for (const v of pollVotes ?? []) {
      const map = votesByPost.get(v.post_id) ?? {};
      map[v.option_id] = (map[v.option_id] ?? 0) + 1;
      votesByPost.set(v.post_id, map);
      totalVotesByPost.set(v.post_id, (totalVotesByPost.get(v.post_id) ?? 0) + 1);
      if (userId && v.user_id === userId) {
        myVoteByPost.set(v.post_id, v.option_id);
      }
    }

    const repliesByPost = new Map<
      string,
      {
        id: number;
        userId: string | null;
        body: string;
        username: string;
        state: string;
        rank: number | null;
        reactions: Record<string, number>;
        createdAt: string;
      }[]
    >();

    for (const tm of threadMessages ?? []) {
      if (!tm.post_id) continue;
      const prof = tm.user_id ? profileLookup.get(tm.user_id) : undefined;
      const lb = tm.user_id ? rankByUser.get(tm.user_id) : undefined;
      const st = prof?.state || tm.author_state || "Nigeria";
      if (st && st !== "Nigeria") {
        stateActivityCounts[st] = (stateActivityCounts[st] ?? 0) + 1;
      }
      const list = repliesByPost.get(tm.post_id) ?? [];
      list.push({
        id: tm.id,
        userId: tm.user_id,
        body: tm.body,
        username: prof?.username || tm.author_username || "Player",
        state: st,
        rank: lb?.rank ?? tm.author_rank ?? null,
        reactions: (tm.reactions ?? {}) as Record<string, number>,
        createdAt: tm.created_at,
      });
      repliesByPost.set(tm.post_id, list);
    }

    const filteredPosts = (posts ?? [])
      .filter((p) => (category === "all" ? true : p.category === category))
      .map((p) => {
        const rawOpts = Array.isArray(p.poll_options)
          ? (p.poll_options as { id: string; label: string }[])
          : [];
        const voteMap = votesByPost.get(p.id) ?? {};
        const totalVotes = totalVotesByPost.get(p.id) ?? 0;
        const myVoteOptionId = myVoteByPost.get(p.id) ?? null;

        const pollOptions = rawOpts.map((opt) => {
          const votes = voteMap[opt.id] ?? 0;
          const percentage =
            totalVotes > 0 ? Number(((votes / totalVotes) * 100).toFixed(1)) : 0;
          return {
            id: opt.id,
            label: opt.label,
            votes,
            percentage,
          };
        });

        const allReplies = repliesByPost.get(p.id) ?? [];
        const authorProf = p.author_id ? profileLookup.get(p.author_id) : null;
        const authorLb = p.author_id ? rankByUser.get(p.author_id) : null;

        return {
          id: p.id,
          kind: p.kind as "poll" | "topic" | "verdict" | "sponsored_poll",
          category: p.category || "General",
          title: p.title,
          body: p.body,
          isPinned: Boolean(p.is_pinned),
          isLocked: Boolean(p.is_locked),
          sponsorName: p.sponsor_name || null,
          sponsorCtaLabel: p.sponsor_cta_label || null,
          sponsorCtaUrl: p.sponsor_cta_url || null,
          authorUsername: authorProf?.username || (p.sponsor_name ? p.sponsor_name : "GuessWhat"),
          authorState: authorProf?.state || null,
          authorRank: authorLb?.rank ?? null,
          isOfficial: !p.author_id,
          pollOptions,
          totalVotes,
          myVoteOptionId,
          replyCount: allReplies.length,
          replies: postId === p.id ? allReplies : allReplies.slice(-4),
          createdAt: p.created_at,
        };
      });

    // Filter ads by state geo-targeting if configured
    const myCleanState = myProfile ? cleanStateName(myProfile.state, myProfile.turf) : "";
    const eligibleAds = (ads ?? []).filter((ad) => {
      const targets: string[] = Array.isArray(ad.target_states) ? ad.target_states : [];
      if (targets.length === 0 || !myCleanState) return true;
      return targets.some((t) => t.toLowerCase() === myCleanState.toLowerCase());
    });

    // Increment impressions asynchronously (non-blocking)
    if (eligibleAds.length > 0 && !postId) {
      Promise.all(
        eligibleAds.map((ad) =>
          supabase
            .from("community_ads")
            .update({ impressions_count: Number(ad.impressions_count ?? 0) + 1 })
            .eq("id", ad.id),
        ),
      ).catch(() => null);
    }

    const topStates = Object.entries(stateActivityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([state, count]) => ({ state, count }));

    // Build mentionDirectory (leaderboard + recent chat/thread participants + recent profiles)
    const { data: recentProfiles } = await supabase
      .from("profiles")
      .select("id, username, state, turf")
      .order("updated_at", { ascending: false })
      .limit(50);

    const mentionMap = new Map<
      string,
      { username: string; state: string; rank: number | null }
    >();

    for (const [uid, pInfo] of profileLookup.entries()) {
      if (!pInfo.username) continue;
      mentionMap.set(pInfo.username.toLowerCase(), {
        username: pInfo.username,
        state: pInfo.state,
        rank: rankByUser.get(uid)?.rank ?? null,
      });
    }
    for (const rp of recentProfiles ?? []) {
      if (!rp.username) continue;
      const key = rp.username.toLowerCase();
      if (!mentionMap.has(key)) {
        mentionMap.set(key, {
          username: rp.username,
          state: cleanStateName(rp.state, rp.turf),
          rank: rankByUser.get(rp.id)?.rank ?? null,
        });
      }
    }

    const mentionDirectory = Array.from(mentionMap.values())
      .sort((a, b) => {
        if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
        if (a.rank !== null) return -1;
        if (b.rank !== null) return 1;
        return a.username.localeCompare(b.username);
      })
      .slice(0, 60);

    const myRankInfo = userId ? rankByUser.get(userId) ?? null : null;

    return NextResponse.json({
      ok: true,
      activeSession: activeSession
        ? { id: activeSession.id, name: activeSession.name }
        : latestCompleted
        ? { id: latestCompleted.id, name: latestCompleted.name }
        : null,
      myIdentity: myProfile
        ? {
            username: myProfile.username,
            state: cleanStateName(myProfile.state, myProfile.turf),
            hasExplicitState: Boolean(myProfile.state && myProfile.state.trim()),
            hasGender: Boolean(myProfile.gender && myProfile.gender.trim()),
            hasDob: Boolean(myProfile.date_of_birth),
            rank: myRankInfo?.rank ?? null,
            points: myRankInfo?.points ?? null,
          }
        : null,
      mentionDirectory,
      topStates,
      liveChat: enrichedLiveChat,
      posts: filteredPosts,
      ads: eligibleAds.map((ad) => ({
        id: ad.id,
        placement: ad.placement,
        sponsorName: ad.sponsor_name,
        headline: ad.headline,
        body: ad.body,
        mediaUrl: ad.media_url,
        ctaLabel: ad.cta_label || "Learn more",
        ctaUrl: ad.cta_url,
        adsenseSlotId: ad.adsense_slot_id || null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load community" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await req.json();
    const { action } = body;

    if (action === "track_ad_click") {
      const { adId } = body;
      if (adId) {
        const { data: existingAd } = await supabase
          .from("community_ads")
          .select("clicks_count")
          .eq("id", adId)
          .maybeSingle();
        if (existingAd) {
          await supabase
            .from("community_ads")
            .update({ clicks_count: Number(existingAd.clicks_count ?? 0) + 1 })
            .eq("id", adId);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "react_message") {
      const { messageId, emoji } = body;
      const allowed = ["fire", "laugh", "target", "skull"];
      if (!messageId || !allowed.includes(emoji)) {
        return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
      }
      const { data: msg } = await supabase
        .from("community_messages")
        .select("reactions")
        .eq("id", messageId)
        .maybeSingle();
      if (!msg) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      const reactions = { ...((msg.reactions ?? {}) as Record<string, number>) };
      reactions[emoji] = (reactions[emoji] ?? 0) + 1;
      await supabase
        .from("community_messages")
        .update({ reactions })
        .eq("id", messageId);

      return NextResponse.json({ ok: true, reactions });
    }

    // All remaining actions require a signed-in userId
    const { userId } = body;
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to join the conversation and vote." },
        { status: 401 },
      );
    }

    // Check mute status
    const { data: muteRow } = await supabase
      .from("community_mutes")
      .select("reason, muted_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (
      muteRow &&
      (!muteRow.muted_until || new Date(muteRow.muted_until).getTime() > Date.now())
    ) {
      return NextResponse.json(
        {
          error: muteRow.reason
            ? `Posting restricted: ${muteRow.reason}`
            : "Your posting access is currently paused by moderation.",
        },
        { status: 403 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, state, turf")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found." }, { status: 404 });
    }

    // Quick Demographic Tag Updater (boosts B2B/Gov Data Completeness + gives player State Badge)
    if (action === "quick_demographics") {
      const { state, gender, birthYear } = body;
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (state && typeof state === "string" && state.trim()) {
        updates.state = state.trim();
        updates.turf = state.trim();
      }
      if (gender && typeof gender === "string" && gender.trim()) {
        updates.gender = gender.trim();
      }
      if (birthYear && Number(birthYear) >= 1940 && Number(birthYear) <= 2012) {
        updates.date_of_birth = `${Number(birthYear)}-06-15`;
      }
      await supabase.from("profiles").update(updates).eq("id", userId);
      return NextResponse.json({ ok: true });
    }

    // Lookup player's live rank in active/latest session
    const { data: activeSess } = await supabase
      .from("game_sessions")
      .select("id, status, ends_at")
      .in("status", ["active", "completed"])
      .order("starts_at", { ascending: false })
      .limit(5);

    const now = Date.now();
    const currentSess =
      (activeSess ?? []).find(
        (s) => s.status === "active" && new Date(s.ends_at).getTime() > now,
      ) ??
      activeSess?.[0] ??
      null;

    let currentRank: number | null = null;
    if (currentSess) {
      const { data: lbRow } = await supabase
        .from("leaderboards")
        .select("rank")
        .eq("session_id", currentSess.id)
        .eq("user_id", userId)
        .maybeSingle();
      currentRank = lbRow?.rank ?? null;
    }

    const authorState = cleanStateName(profile.state, profile.turf);

    if (action === "vote_poll") {
      const { postId, optionId, responseMs = 0 } = body;
      if (!postId || !optionId) {
        return NextResponse.json({ error: "Missing poll selection" }, { status: 400 });
      }

      const { data: post } = await supabase
        .from("community_posts")
        .select("id, poll_options, is_locked")
        .eq("id", postId)
        .maybeSingle();

      if (!post || post.is_locked) {
        return NextResponse.json({ error: "This poll is closed." }, { status: 400 });
      }

      await supabase.from("community_poll_votes").upsert(
        {
          post_id: postId,
          user_id: userId,
          option_id: String(optionId),
          response_ms: Math.max(0, Math.min(Number(responseMs) || 0, 300000)),
        },
        { onConflict: "post_id,user_id" },
      );

      // Return updated tallies for instant UI update
      const { data: votes } = await supabase
        .from("community_poll_votes")
        .select("option_id")
        .eq("post_id", postId);

      const counts: Record<string, number> = {};
      for (const v of votes ?? []) {
        counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
      }
      const totalVotes = (votes ?? []).length;
      const rawOpts = Array.isArray(post.poll_options)
        ? (post.poll_options as { id: string; label: string }[])
        : [];
      const pollOptions = rawOpts.map((opt) => {
        const c = counts[opt.id] ?? 0;
        return {
          id: opt.id,
          label: opt.label,
          votes: c,
          percentage: totalVotes > 0 ? Number(((c / totalVotes) * 100).toFixed(1)) : 0,
        };
      });

      return NextResponse.json({
        ok: true,
        myVoteOptionId: String(optionId),
        totalVotes,
        pollOptions,
      });
    }

    if (action === "send_chat" || action === "reply_post") {
      const check = validateCleanBanter(String(body.body ?? ""), 500);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }

      // Simple anti-flood check (prevent identical message within 5s)
      const { data: recentMsg } = await supabase
        .from("community_messages")
        .select("body, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        recentMsg &&
        Date.now() - new Date(recentMsg.created_at).getTime() < 2500
      ) {
        return NextResponse.json(
          { error: "Hold on a second before sending another message." },
          { status: 429 },
        );
      }

      const isReply = action === "reply_post";
      const postId = isReply ? String(body.postId || "") : null;
      let replyPostTitle = "";

      if (isReply) {
        if (!postId) {
          return NextResponse.json({ error: "Topic ID required" }, { status: 400 });
        }
        const { data: targetPost } = await supabase
          .from("community_posts")
          .select("id, title, is_locked")
          .eq("id", postId)
          .maybeSingle();
        if (!targetPost || targetPost.is_locked) {
          return NextResponse.json(
            { error: "Replies are locked on this topic." },
            { status: 403 },
          );
        }
        replyPostTitle = targetPost.title || "a topic";
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("community_messages")
        .insert({
          room: isReply ? "thread" : "live_arena",
          session_id: currentSess?.id ?? null,
          post_id: postId,
          user_id: userId,
          is_system: false,
          body: check.cleaned,
          author_username: profile.username,
          author_state: authorState,
          author_rank: currentRank,
        })
        .select(
          "id, post_id, user_id, is_system, body, author_username, author_state, author_rank, reactions, created_at",
        )
        .single();

      if (insertErr || !inserted) {
        return NextResponse.json(
          { error: insertErr?.message || "Could not send message" },
          { status: 500 },
        );
      }

      // Notify @mentioned players in their Inbox (up to 5 unique mentions, excluding self)
      const mentionMatches = Array.from(
        check.cleaned.matchAll(/(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{2,24})\b/g),
      ).map((m) => m[1].toLowerCase());
      const uniqueMentions = Array.from(new Set(mentionMatches))
        .filter((u) => u !== profile.username.toLowerCase())
        .slice(0, 5);

      if (uniqueMentions.length > 0) {
        try {
          await Promise.all(
            uniqueMentions.map(async (uname) => {
              const { data: taggedUser } = await supabase
                .from("profiles")
                .select("id, username")
                .ilike("username", uname)
                .maybeSingle();
              if (taggedUser && taggedUser.id !== userId) {
                await supabase.from("notifications").insert({
                  user_id: taggedUser.id,
                  title: isReply
                    ? `@${profile.username} tagged you on "${replyPostTitle.slice(0, 48)}"`
                    : `@${profile.username} tagged you in the Live Banter Room`,
                  body: `"${check.cleaned}"`,
                });
              }
            }),
          );
        } catch {
          // Non-fatal if notification insert fails
        }
      }

      return NextResponse.json({
        ok: true,
        message: {
          id: inserted.id,
          postId: inserted.post_id,
          userId: inserted.user_id,
          isSystem: inserted.is_system,
          body: inserted.body,
          username: inserted.author_username,
          state: inserted.author_state || "Nigeria",
          rank: inserted.author_rank,
          reactions: (inserted.reactions ?? {}) as Record<string, number>,
          createdAt: inserted.created_at,
        },
      });
    }

    if (action === "create_topic") {
      const titleCheck = validateCleanBanter(String(body.title ?? ""), 140);
      if (!titleCheck.ok) {
        return NextResponse.json({ error: titleCheck.error }, { status: 400 });
      }
      const rawBody = String(body.body ?? "").trim();
      let cleanBody: string | null = null;
      if (rawBody) {
        const bodyCheck = validateCleanBanter(rawBody, 500);
        if (!bodyCheck.ok) {
          return NextResponse.json({ error: bodyCheck.error }, { status: 400 });
        }
        cleanBody = bodyCheck.cleaned;
      }

      const rawPollOptions: string[] = Array.isArray(body.pollOptions)
        ? body.pollOptions
            .map((o: unknown) => String(o ?? "").trim())
            .filter((o: string) => o.length > 0)
            .slice(0, 6)
        : [];

      for (const optText of rawPollOptions) {
        const optCheck = validateCleanBanter(optText, 80);
        if (!optCheck.ok) {
          return NextResponse.json({ error: optCheck.error }, { status: 400 });
        }
      }

      const isPoll = rawPollOptions.length >= 2;
      const pollOptionsJson = isPoll
        ? rawPollOptions.map((label, idx) => ({
            id: `opt_${idx + 1}_${Date.now().toString(36)}`,
            label,
          }))
        : [];

      const allowedCategories = [
        "Game Banter",
        "Banking & Fintech",
        "Telecoms & Data",
        "Economy & Policy",
        "Food & Culture",
        "Sports & Music",
      ];
      const chosenCategory = allowedCategories.includes(body.category)
        ? body.category
        : "Game Banter";

      const { data: created, error: createErr } = await supabase
        .from("community_posts")
        .insert({
          author_id: userId,
          session_id: currentSess?.id ?? null,
          kind: isPoll ? "poll" : "topic",
          category: chosenCategory,
          title: titleCheck.cleaned,
          body: cleanBody,
          poll_options: pollOptionsJson,
          is_pinned: false,
        })
        .select("*")
        .single();

      if (createErr || !created) {
        return NextResponse.json(
          { error: createErr?.message || "Could not create topic" },
          { status: 500 },
        );
      }

      const topicCombined = `${titleCheck.cleaned} ${cleanBody || ""}`;
      const topicMentions = Array.from(
        topicCombined.matchAll(/(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{2,24})\b/g),
      ).map((m) => m[1].toLowerCase());
      const uniqueTopicMentions = Array.from(new Set(topicMentions))
        .filter((u) => u !== profile.username.toLowerCase())
        .slice(0, 5);

      if (uniqueTopicMentions.length > 0) {
        try {
          await Promise.all(
            uniqueTopicMentions.map(async (uname) => {
              const { data: taggedUser } = await supabase
                .from("profiles")
                .select("id")
                .ilike("username", uname)
                .maybeSingle();
              if (taggedUser && taggedUser.id !== userId) {
                await supabase.from("notifications").insert({
                  user_id: taggedUser.id,
                  title: `@${profile.username} tagged you in a new topic`,
                  body: `"${titleCheck.cleaned}"`,
                });
              }
            }),
          );
        } catch {
          // Non-fatal
        }
      }

      return NextResponse.json({ ok: true, postId: created.id });
    }

    return NextResponse.json({ error: "Unsupported community action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Community request failed" },
      { status: 500 },
    );
  }
}
