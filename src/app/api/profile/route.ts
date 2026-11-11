import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/supabase/api-auth";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_MIMES = new Set([
  "image/webp",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
]);

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webp")) return "webp";
  if (m.includes("png")) return "png";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

async function uploadAvatarToStorage(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("Avatar image must be under 2MB.");
  }
  const normalizedMime =
    mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    throw new Error("Unsupported image format. Use WebP, JPEG, PNG, or GIF.");
  }

  const ext = extFromMime(normalizedMime);
  const fileName = `avatar-${Date.now()}.${ext}`;
  const objectPath = `${userId}/${fileName}`;

  // List prior files in user's folder so we can prune stale avatars after uploading the new one
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(userId, { limit: 20 });

  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(objectPath, buffer, {
      contentType: normalizedMime,
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  const stalePaths = (existingFiles ?? [])
    .filter((f) => f.name && f.name !== fileName)
    .map((f) => `${userId}/${f.name}`);

  if (stalePaths.length > 0) {
    await supabase.storage.from("avatars").remove(stalePaths).catch(() => null);
  }

  const { data: publicData } = supabase.storage
    .from("avatars")
    .getPublicUrl(objectPath);

  return publicData.publicUrl;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await requireAuthUser(req, searchParams.get("userId"));
    if (!auth.user) {
      return auth.response;
    }
    const userId = auth.user.id;

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
    const contentType = req.headers.get("content-type") || "";
    const supabase = createSupabaseServiceClient();

    // Binary multipart/form-data avatar upload -> Supabase Storage CDN
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const auth = await requireAuthUser(req, formData.get("userId"));
      if (!auth.user) {
        return auth.response;
      }
      const userId = auth.user.id;
      const file = formData.get("avatar");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Avatar image file is required." },
          { status: 400 },
        );
      }

      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const publicUrl = await uploadAvatarToStorage(
        supabase,
        userId,
        buffer,
        file.type || "image/webp",
      );

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profErr) {
        return NextResponse.json({ error: profErr.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, avatarUrl: publicUrl });
    }

    // Standard JSON profile & bank details update
    const body = await req.json();
    const auth = await requireAuthUser(req, body.userId);
    if (!auth.user) {
      return auth.response;
    }
    const userId = auth.user.id;

    const {
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

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    let resolvedAvatarUrl: string | undefined;

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
      const trimmedAvatar = avatarUrl.trim();
      if (!trimmedAvatar) {
        profileUpdates.avatar_url = null;
        resolvedAvatarUrl = "";
      } else if (trimmedAvatar.startsWith("data:image/")) {
        const match = trimmedAvatar.match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
        );
        if (!match) {
          return NextResponse.json(
            { error: "Invalid avatar image payload." },
            { status: 400 },
          );
        }
        const uploadedUrl = await uploadAvatarToStorage(
          supabase,
          userId,
          Buffer.from(match[2], "base64"),
          match[1],
        );
        profileUpdates.avatar_url = uploadedUrl;
        resolvedAvatarUrl = uploadedUrl;
      } else if (trimmedAvatar.startsWith("https://")) {
        profileUpdates.avatar_url = trimmedAvatar;
        resolvedAvatarUrl = trimmedAvatar;
      }
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

    return NextResponse.json({
      ok: true,
      ...(resolvedAvatarUrl !== undefined ? { avatarUrl: resolvedAvatarUrl } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
