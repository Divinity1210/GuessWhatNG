import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password, username, fullName, phone, referralCode, turf } = await req.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, username, and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRef = referralCode ? String(referralCode).trim().toUpperCase() : "";
    const cleanTurf = turf ? String(turf).trim() : "Lagos (Eko)";

    const supabase = createSupabaseServiceClient();

    // Check if username is already taken by a DIFFERENT email
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (existingProfile) {
      const { data: ownerUser } = await supabase.auth.admin.getUserById(existingProfile.id);
      if (ownerUser?.user?.email?.toLowerCase() !== cleanEmail) {
        return NextResponse.json(
          { error: `Username "@${cleanUsername}" is already taken. Try another one.` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
        full_name: fullName ? String(fullName).trim() : cleanUsername,
        phone: phone ? String(phone).trim() : null,
        referral_code: cleanRef,
        turf: cleanTurf,
      },
    });

    if (error) {
      // If the user previously tried to register this email and got stuck, activate & update password
      if (error.message.toLowerCase().includes("already") || error.status === 422) {
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existingAuthUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );
        if (existingAuthUser) {
          const { error: updErr } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
            password: String(password),
            email_confirm: true,
            user_metadata: {
              ...existingAuthUser.user_metadata,
              username: cleanUsername,
              turf: cleanTurf,
            },
          });
          if (!updErr) {
            return NextResponse.json({
              ok: true,
              userId: existingAuthUser.id,
              email: cleanEmail,
              recovered: true,
            });
          }
        }
      }

      return NextResponse.json(
        { error: error.message || "Could not create account." },
        { status: 400 }
      );
    }

    if (phone && data.user) {
      await supabase
        .from("profiles")
        .update({ phone: String(phone).trim() })
        .eq("id", data.user.id);
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id,
      email: data.user?.email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create account." },
      { status: 500 }
    );
  }
}
