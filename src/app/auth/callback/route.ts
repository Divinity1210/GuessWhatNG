import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

function sanitizeBaseUsername(raw: string, fallbackId: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 16);
  }
  return `player_${fallbackId.replace(/-/g, "").slice(0, 8)}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const refCode = (searchParams.get("ref") ?? "").trim().toUpperCase();

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=oauth_cancelled`);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        const admin = createSupabaseServiceClient();
        const user = data.user;
        const meta = user.user_metadata ?? {};
        const googleName = String(
          meta.full_name || meta.name || user.email?.split("@")[0] || "Player",
        ).trim();
        const googleAvatar =
          typeof (meta.avatar_url || meta.picture) === "string"
            ? String(meta.avatar_url || meta.picture)
            : null;
        const emailPrefix = user.email?.split("@")[0] ?? "";

        let referrerId: string | null = null;
        if (refCode) {
          const { data: refProfile } = await admin
            .from("profiles")
            .select("id")
            .ilike("referral_code", refCode)
            .maybeSingle();
          if (refProfile?.id && refProfile.id !== user.id) {
            referrerId = refProfile.id;
          }
        }

        const { data: existingProfile } = await admin
          .from("profiles")
          .select("id, username, full_name, avatar_url, referred_by")
          .eq("id", user.id)
          .maybeSingle();

        const isAutoPlaceholder =
          !existingProfile ||
          existingProfile.username === `player_${user.id.slice(0, 8)}`;

        let candidateUsername = existingProfile?.username ?? "";
        if (isAutoPlaceholder) {
          const base = sanitizeBaseUsername(emailPrefix || googleName, user.id);
          candidateUsername = base;
          const { data: collision } = await admin
            .from("profiles")
            .select("id")
            .ilike("username", candidateUsername)
            .neq("id", user.id)
            .maybeSingle();
          if (collision) {
            candidateUsername = `${base.slice(0, 15)}_${Math.floor(
              100 + Math.random() * 900,
            )}`;
          }
        }

        if (!existingProfile) {
          await admin.from("profiles").insert({
            id: user.id,
            username: candidateUsername,
            full_name: googleName,
            avatar_url: googleAvatar,
            referred_by: referrerId,
          });
        } else {
          const updates: Record<string, unknown> = {};
          if (isAutoPlaceholder && candidateUsername) {
            updates.username = candidateUsername;
          }
          if (!existingProfile.full_name && googleName) {
            updates.full_name = googleName;
          }
          if (!existingProfile.avatar_url && googleAvatar) {
            updates.avatar_url = googleAvatar;
          }
          if (!existingProfile.referred_by && referrerId) {
            updates.referred_by = referrerId;
          }
          if (Object.keys(updates).length > 0) {
            await admin.from("profiles").update(updates).eq("id", user.id);
          }
        }

        await admin
          .from("wallets")
          .upsert({ user_id: user.id }, { onConflict: "user_id" });
      } catch (syncErr) {
        console.error("Google profile sync warning:", syncErr);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
