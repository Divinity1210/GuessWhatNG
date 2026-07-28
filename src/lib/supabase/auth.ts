import { createSupabaseBrowserClient } from "./client";

export type SignUpPayload = {
  email: string;
  password: string;
  username: string;
  referralCode?: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

/**
 * Sign up a new player. The DB trigger `handle_new_user` auto-creates
 * a profile row + wallet from the metadata we pass here.
 */
export async function signUp({ email, password, username, referralCode }: SignUpPayload) {
  const supabase = createSupabaseBrowserClient();

  // If a referral code is provided, look up the referrer's profile id
  let referredBy: string | undefined;
  if (referralCode?.trim()) {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode.trim().toUpperCase())
      .single();

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
      },
    },
  });

  if (error) throw error;

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
