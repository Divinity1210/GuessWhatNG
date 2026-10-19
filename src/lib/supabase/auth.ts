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

/**
 * Sign up a new player. The DB trigger `handle_new_user` auto-creates
 * a profile row + wallet from the metadata we pass here.
 */
export async function signUp({ email, password, username, referralCode, turf }: SignUpPayload) {
  const supabase = createSupabaseBrowserClient();
  const cleanRef = referralCode?.trim().toUpperCase();
  const selectedTurf = turf?.trim() || "Lagos (Eko)";

  // If a referral code is provided, look up the referrer's profile id
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
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      data: {
        username: username.trim(),
        full_name: "",
        referral_code: cleanRef || "",
        turf: selectedTurf,
      },
    },
  });

  if (error) throw error;

  if (data.user && typeof window !== "undefined") {
    localStorage.setItem(`gw_turf_${data.user.id}`, selectedTurf);
    localStorage.setItem(`gw_streak_${data.user.id}`, "1");
  }

  // If we found a referrer, update the profile with referred_by
  if (referredBy && data.user) {
    await supabase
      .from("profiles")
      .update({ referred_by: referredBy })
      .eq("id", data.user.id);
  }

  return data;
}

/**
 * Sign in with email + password.
 */
export async function signIn({ email, password }: SignInPayload) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
