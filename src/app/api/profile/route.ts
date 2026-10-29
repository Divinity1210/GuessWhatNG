import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const [{ data: profile }, { data: bankSetting }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, full_name, phone, state, date_of_birth, gender, avatar_url, referral_code, created_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", `payout_bank_${userId}`)
        .maybeSingle(),
    ]);

    const bank = (bankSetting?.value as {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    }) ?? {
      bankName: "",
      accountNumber: "",
      accountName: "",
    };

    return NextResponse.json({
      ok: true,
      profile,
      bank,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      username,
      fullName,
      phone,
      location,
      dateOfBirth,
      gender,
      avatarUrl,
      bankName,
      accountNumber,
      accountName,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof username === "string" && username.trim()) {
      profileUpdates.username = username.trim();
    }
    if (typeof fullName === "string") {
      profileUpdates.full_name = fullName.trim();
    }
    if (typeof phone === "string") {
      profileUpdates.phone = phone.trim() || null;
    }
    if (typeof location === "string") {
      profileUpdates.state = location.trim() || null;
      profileUpdates.turf = location.trim() || "Lagos";
    }
    if (typeof dateOfBirth === "string") {
      profileUpdates.date_of_birth = dateOfBirth.trim() || null;
    }
    if (typeof gender === "string") {
      profileUpdates.gender = gender.trim() || null;
    }
    if (typeof avatarUrl === "string") {
      profileUpdates.avatar_url = avatarUrl.trim() || null;
    }

    const { error: profErr } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", userId);

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    if (
      typeof bankName === "string" ||
      typeof accountNumber === "string" ||
      typeof accountName === "string"
    ) {
      await supabase.from("app_settings").upsert(
        {
          key: `payout_bank_${userId}`,
          value: {
            bankName: (bankName ?? "").trim(),
            accountNumber: (accountNumber ?? "").trim(),
            accountName: (accountName ?? "").trim(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
