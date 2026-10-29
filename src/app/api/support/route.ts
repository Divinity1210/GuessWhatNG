import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function resolveUserId(supabase: ReturnType<typeof createSupabaseServiceClient>, userId?: string) {
  if (userId && UUID_RE.test(userId)) return userId;
  const { data: demoProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", "naija_striker")
    .maybeSingle();
  if (demoProfile?.id) return demoProfile.id;
  const { data: anyProfile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
  return anyProfile?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const ticketId = req.nextUrl.searchParams.get("ticketId");
    if (ticketId) {
      const { data: messages, error: mErr } = await supabase
        .from("ticket_messages")
        .select("*, profiles:sender_id(username, role)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (mErr) {
        const { data: fallbackMsgs } = await supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });
        return NextResponse.json({ messages: fallbackMsgs ?? [] });
      }
      return NextResponse.json({ messages: messages ?? [] });
    }

    const rawUserId = req.nextUrl.searchParams.get("userId") ?? "";
    const resolvedUserId = await resolveUserId(supabase, rawUserId);

    if (!resolvedUserId) {
      return NextResponse.json({ tickets: [] });
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, ticket_messages(*)")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ tickets: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await req.json();
    const resolvedUserId = await resolveUserId(supabase, body.userId);

    if (!resolvedUserId) {
      return NextResponse.json({ error: "No player profile found" }, { status: 400 });
    }

    if (body.action === "reply") {
      const { ticketId, message } = body;
      if (!ticketId || !message?.trim()) {
        return NextResponse.json({ error: "ticketId and message are required" }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: resolvedUserId,
          body: String(message).trim(),
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      return NextResponse.json({ ok: true, message: data });
    }

    const { subject, message } = body;
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: resolvedUserId,
        subject: String(subject).trim(),
        status: "open",
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: ticketError?.message || "Failed to create ticket" },
        { status: 500 }
      );
    }

    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: resolvedUserId,
      body: String(message).trim(),
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Support action failed" },
      { status: 500 }
    );
  }
}
