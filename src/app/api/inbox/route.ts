import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function resolveUserId(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId?: string | null,
): Promise<string | null> {
  if (userId && UUID_RE.test(userId)) return userId;
  const { data: demoProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", "naija_striker")
    .maybeSingle();
  if (demoProfile?.id) return demoProfile.id;
  const { data: anyProfile } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();
  return anyProfile?.id ?? null;
}

const FALLBACK_NOTIFICATIONS = [
  {
    id: 9001,
    title: "Guess What Live Session is Open! (₦500,000 Pool)",
    body: "Predict the option most players will select across 10 questions. Top 36 players share ₦500,000 every 3 days!",
    read: false,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 9002,
    title: "Session Result: Lagos vs Abuja Street Derby",
    body: "The previous session has concluded! Check the Winners Board on the Leaderboard page to see the top 36 winners.",
    read: false,
    created_at: new Date(Date.now() - 14 * 3600_000).toISOString(),
  },
  {
    id: 9003,
    title: "Welcome to Guess What!",
    body: "Think like the crowd to climb the live leaderboard. Invite friends with your referral code to climb the Monthly Referral Leaderboard.",
    read: true,
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const rawUserId = req.nextUrl.searchParams.get("userId");
    const resolvedUserId = await resolveUserId(supabase, rawUserId);

    if (!resolvedUserId) {
      const unreadCount = FALLBACK_NOTIFICATIONS.filter((n) => !n.read).length;
      return NextResponse.json({
        ok: true,
        notifications: FALLBACK_NOTIFICATIONS,
        unreadCount,
      });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, read, created_at")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      const unreadCount = FALLBACK_NOTIFICATIONS.filter((n) => !n.read).length;
      return NextResponse.json({
        ok: true,
        notifications: FALLBACK_NOTIFICATIONS,
        unreadCount,
      });
    }

    let notifications = data ?? [];

    // Seed initial welcome & session announcements if player inbox is completely empty
    if (notifications.length === 0) {
      const { data: inserted } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: resolvedUserId,
            title: "Guess What Live Session is Open! (₦500,000 Pool)",
            body: "Predict the option most players will select across 10 questions. Top 36 players share ₦500,000 every 3 days!",
            read: false,
          },
          {
            user_id: resolvedUserId,
            title: "Welcome to Guess What — Think & Win!",
            body: "Your player inbox receives live session alerts, winner announcements, and support replies from the Guess What team.",
            read: false,
          },
        ])
        .select("id, user_id, title, body, read, created_at");

      if (inserted && inserted.length > 0) {
        notifications = inserted;
      } else {
        notifications = FALLBACK_NOTIFICATIONS.map((n) => ({
          ...n,
          user_id: resolvedUserId,
        }));
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
        error: err instanceof Error ? err.message : "Failed to load inbox",
        notifications: FALLBACK_NOTIFICATIONS,
        unreadCount: 2,
      },
      { status: 200 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await req.json();
    const { userId, notificationId, markAll } = body;

    const resolvedUserId = await resolveUserId(supabase, userId);
    if (!resolvedUserId) {
      return NextResponse.json({ ok: true });
    }

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

    return NextResponse.json({ error: "notificationId or markAll required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update notification" },
      { status: 500 },
    );
  }
}
