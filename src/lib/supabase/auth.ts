import type { User, Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./client";

export type SignUpPayload = {
  email: string;
  password: string;
  username: string;
  referralCode?: string;
  turf?: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

function createLocalDemoSession(params: {
  email: string;
  username: string;
  turf: string;
  referralCode?: string;
}): { user: User; session: Session } {
  const userId = `local-${params.username.toLowerCase().replace(/[^a-z0-9]/g, "") || "player"}`;
  const myRefCode = `${params.username.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "GW")}26`;
  const welcomeCoins = params.referralCode ? 150 : 100;

  const mockUser = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: params.email,
    email_confirmed_at: new Date().toISOString(),
    user_metadata: {
      username: params.username,
      turf: params.turf,
      referral_code: myRefCode,
    },
    app_metadata: {},
    created_at: new Date().toISOString(),
  } as unknown as User;

  const mockSession = {
    access_token: "local-demo-token",
    refresh_token: "local-demo-refresh",
    expires_in: 604800,
    token_type: "bearer",
    user: mockUser,
  } as unknown as Session;

  if (typeof window !== "undefined") {
    const profileObj = {
      id: userId,
      username: params.username,
      full_name: params.username,
      avatar_url: null,
      role: "player",
      referral_code: myRefCode,
      turf: params.turf,
      streak_days: 1,
    };
    localStorage.setItem("gw_demo_user", JSON.stringify(mockUser));
    localStorage.setItem("gw_demo_profile", JSON.stringify(profileObj));
    localStorage.setItem(`gw_turf_${userId}`, params.turf);
    localStorage.setItem(`gw_streak_${userId}`, "1");
    if (!localStorage.getItem(`gw_bonus_coins_${userId}`)) {
      localStorage.setItem(`gw_bonus_coins_${userId}`, String(welcomeCoins));
    }
    document.cookie = "gw_demo_session=1; path=/; max-age=604800; SameSite=Lax";
    window.dispatchEvent(new Event("gw-auth-change"));
  }

  return { user: mockUser, session: mockSession };
}

/**
 * Sign up a new player. The DB trigger `handle_new_user` auto-creates
 * a profile row + wallet from the metadata we pass here.
 * Falls back cleanly to a local session if the remote Supabase project is paused.
 */
export async function signUp({ email, password, username, referralCode, turf }: SignUpPayload) {
  const supabase = createSupabaseBrowserClient();
  const cleanRef = referralCode?.trim().toUpperCase();
  const selectedTurf = turf?.trim() || "lagos";

  try {
    let referredBy: string | undefined;
    if (cleanRef) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", cleanRef)
        .maybeSingle();

      if (referrer) {
        referredBy = referrer.id;
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        data: {
          username: username.trim(),
          full_name: "",
          referral_code: cleanRef || "",
          turf: selectedTurf,
        },
      },
    });

    if (error) {
      // If Supabase is paused/unreachable, fall back to local demo session
      if (
        error.message.includes("timed out") ||
        error.message.includes("offline") ||
        error.message.includes("fetch") ||
        error.status === 503
      ) {
        return createLocalDemoSession({
          email,
          username: username.trim(),
          turf: selectedTurf,
          referralCode: cleanRef,
        });
      }
      throw error;
    }

    if (data.user && typeof window !== "undefined") {
      localStorage.setItem(`gw_turf_${data.user.id}`, selectedTurf);
      localStorage.setItem(`gw_streak_${data.user.id}`, "1");
    }

    if (referredBy && data.user) {
      await supabase
        .from("profiles")
        .update({ referred_by: referredBy })
        .eq("id", data.user.id);
    }

    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timed out") || msg.includes("offline") || msg.includes("fetch")) {
      return createLocalDemoSession({
        email,
        username: username.trim(),
        turf: selectedTurf,
        referralCode: cleanRef,
      });
    }
    throw err;
  }
}

/**
 * Sign in with email + password.
 */
export async function signIn({ email, password }: SignInPayload) {
  const supabase = createSupabaseBrowserClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (
        error.message.includes("timed out") ||
        error.message.includes("offline") ||
        error.message.includes("fetch") ||
        error.status === 503
      ) {
        const fallbackUsername = email.split("@")[0] || "naija_player";
        return createLocalDemoSession({
          email,
          username: fallbackUsername,
          turf: "lagos",
        });
      }
      throw error;
    }
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timed out") || msg.includes("offline") || msg.includes("fetch")) {
      const fallbackUsername = email.split("@")[0] || "naija_player";
      return createLocalDemoSession({
        email,
        username: fallbackUsername,
        turf: "lagos",
      });
    }
    throw err;
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("gw_demo_user");
    localStorage.removeItem("gw_demo_profile");
    document.cookie = "gw_demo_session=; path=/; max-age=0";
    window.dispatchEvent(new Event("gw-auth-change"));
  }
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut().catch(() => {});
}
