import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();
    const raw = String(identifier ?? "").trim();
    if (!raw) {
      return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    let resolvedEmail = raw.toLowerCase();

    // If user entered a username instead of an email, look up their profile -> auth.users email
    if (!raw.includes("@")) {
      const cleanUsername = raw.replace(/^@/, "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (profile?.id) {
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        if (userData?.user?.email) {
          resolvedEmail = userData.user.email.toLowerCase();
          if (!userData.user.email_confirmed_at) {
            await supabase.auth.admin.updateUserById(profile.id, { email_confirm: true });
          }
          return NextResponse.json({ ok: true, email: resolvedEmail });
        }
      }
    }

    // Ensure that if the email exists in auth.users and is unconfirmed, we auto-confirm it before signInWithPassword
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const matchedUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === resolvedEmail
    );

    if (matchedUser && !matchedUser.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(matchedUser.id, { email_confirm: true });
    }

    return NextResponse.json({ ok: true, email: resolvedEmail });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to prepare sign-in" },
      { status: 500 }
    );
  }
}
