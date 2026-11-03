import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const rawUserId = req.nextUrl.searchParams.get("userId");
    const resolvedUserId = rawUserId && UUID_RE.test(rawUserId) ? rawUserId : null;

    if (!resolvedUserId) {
      return NextResponse.json({
        ok: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, read, created_at")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          notifications: [],
          unreadCount: 0,
        },
        { status: 500 },
      );
    }

    const notifications = data ?? [];
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
        notifications: [],
        unreadCount: 0,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await req.json();
    const { userId, notificationId, markAll } = body;

    const resolvedUserId = userId && UUID_RE.test(userId) ? userId : null;
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
