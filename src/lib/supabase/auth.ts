"use client";

import { createSupabaseBrowserClient } from "./client";

export type SignUpPayload = {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  phone?: string;
  referralCode?: string;
  turf?: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

function clearLocalDemoStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("gw_demo_user");
    localStorage.removeItem("gw_demo_profile");
    document.cookie = "gw_demo_session=; path=/; max-age=0";
  }
}

export async function signUp({
  email,
  password,
  username,
  fullName,
  phone,
  referralCode,
  turf,
}: SignUpPayload) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();
  const cleanRef = referralCode ? referralCode.trim().toUpperCase() : "";
  const cleanTurf = turf || "Lagos (Eko)";

  clearLocalDemoStorage();

  // 1. Create and auto-confirm user via server admin endpoint so no email rate-limit or confirmation block occurs
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: cleanEmail,
      password,
      username: cleanUsername,
      fullName: fullName || cleanUsername,
      phone: phone || null,
      referralCode: cleanRef,
      turf: cleanTurf,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "Could not create account.");
  }

  // 2. Sign in immediately to establish browser auth session
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signIn({ email, password }: SignInPayload) {
  clearLocalDemoStorage();

  let resolvedEmail = email.trim().toLowerCase();

  // Pre-resolve username or unconfirmed email via server admin helper
  try {
    const prepRes = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email.trim() }),
    });
    const prepData = await prepRes.json().catch(() => ({}));
    if (prepRes.ok && prepData.email) {
      resolvedEmail = String(prepData.email).trim().toLowerCase();
    }
  } catch {
    // Proceed with direct sign-in if endpoint unreachable
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  clearLocalDemoStorage();
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut().catch(() => {});
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("gw-auth-change"));
  }
}

export async function getCurrentUser() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, wallets(*)")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
