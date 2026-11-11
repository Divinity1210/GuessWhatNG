import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getOptionalAuthUser, requireAuthUser } from "@/lib/supabase/api-auth";

const FALLBACK_NOTIFICATIONS = [
  {
    id: 9001,
    title: "GuessWhat Live Session is Open (₦500,000 Pool)",
    body: "Predict the option most players will select across 10 questions. Top 36 players share ₦500,000 every 3 days.",
    read: false,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 9002,
    title: "Session Result: Lagos vs Abuja Street Derby",
    body: "The previous session has concluded. Check the Winners Board on the Leaderboard page to see the top 36 winners.",
    read: false,
    created_at: new Date(Date.now() - 14 * 3600_000).toISOString(),
  },
  {
    id: 9003,
    title: "Welcome to GuessWhat",
    body: "Predict what the crowd picks to climb the live leaderboard. Invite friends with your referral code to climb the Monthly Referral Leaderboard.",
    read: true,
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuthUser(req);
    if (!authUser) {
      const unreadCount = FALLBACK_NOTIFICATIONS.filter((n) => !n.read).length;
      return NextResponse.json({
        ok: true,
        notifications: FALLBACK_NOTIFICATIONS,
        unreadCount,
      });
    }

    const supabase = createSupabaseServiceClient();
    const resolvedUserId = authUser.id;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, read, created_at")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, notifications: [], unreadCount: 0 },
        { status: 500 },
      );
    }

    let notifications = data ?? [];

    // Seed initial welcome & session announcements if player inbox is completely empty
    if (notifications.length === 0) {
      const { data: hasProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", resolvedUserId)
        .maybeSingle();

      if (hasProfile) {
        const { data: inserted } = await supabase
          .from("notifications")
          .insert([
            {
              user_id: resolvedUserId,
              title: "GuessWhat Live Session is Open (₦500,000 Pool)",
              body: "Predict the option most players will select across 10 questions. Top 36 players share ₦500,000 every 3 days.",
              read: false,
            },
            {
              user_id: resolvedUserId,
              title: "Welcome to GuessWhat",
              body: "Your player inbox receives live session alerts, winner announcements, mentions, and support replies from the GuessWhat team.",
              read: false,
            },
          ])
          .select("id, user_id, title, body, read, created_at");

        if (inserted && inserted.length > 0) {
          notifications = inserted;
        }
      }
    }

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      ok: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load inbox",
        notifications: [],
        unreadCount: 0,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await requireAuthUser(req, body.userId);
    if (auth.response) {
      return auth.response;
    }

    const supabase = createSupabaseServiceClient();
    const resolvedUserId = auth.user.id;
    const { notificationId, markAll } = body;

    if (markAll) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", resolvedUserId)
        .eq("read", false);

      return NextResponse.json({ ok: true });
    }

    if (notificationId !== undefined && notificationId !== null) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", resolvedUserId);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "notificationId or markAll required" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update notification" },
      { status: 500 },
    );
  }
}
