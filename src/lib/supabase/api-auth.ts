import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Cryptographically verifies the caller's Supabase Auth session via either:
 *   1. `Authorization: Bearer <access_token>` header (works in all mobile WebViews), or
 *   2. `@supabase/ssr` HTTP cookies on same-origin requests.
 * Never trusts client-supplied `userId` parameters.
 */
export async function getOptionalAuthUser(
  req: NextRequest,
): Promise<User | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const serviceSupabase = createSupabaseServiceClient();
        const { data, error } = await serviceSupabase.auth.getUser(token);
        if (!error && data?.user) {
          return data.user;
        }
      } catch {
        // Fall through to cookie-based verification
      }
    }
  }

  try {
    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await serverSupabase.auth.getUser();
    if (!error && user) {
      return user;
    }
  } catch {
    // Unauthenticated
  }

  return null;
}

/**
 * Enforces an authenticated Supabase session on mutation or private-data routes.
 * Rejects unauthenticated callers (401) and cross-user spoofing attempts (403).
 */
export async function requireAuthUser(
  req: NextRequest,
  claimedUserId?: unknown,
): Promise<
  | { user: User; response?: undefined }
  | { user: null; response: NextResponse }
> {
  const user = await getOptionalAuthUser(req);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          ok: false,
          error: "Please sign in to continue.",
        },
        { status: 401 },
      ),
    };
  }

  if (
    isUuid(claimedUserId) &&
    claimedUserId.trim().toLowerCase() !== user.id.toLowerCase()
  ) {
    return {
      user: null,
      response: NextResponse.json(
        {
          ok: false,
          error: "Forbidden: session identity mismatch.",
        },
        { status: 403 },
      ),
    };
  }

  return { user };
}
