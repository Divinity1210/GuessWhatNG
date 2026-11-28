"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  type SignUpPayload,
  type SignInPayload,
} from "@/lib/supabase/auth";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  referral_code: string;
  turf?: string;
  streak_days?: number;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
};

type AuthActions = {
  signUp: (payload: SignUpPayload) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (payload: SignInPayload) => Promise<void>;
  signInWithGoogle: (options?: { referralCode?: string; next?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearLegacyDemoStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("gw_demo_user");
    localStorage.removeItem("gw_demo_profile");
    document.cookie = "gw_demo_session=; path=/; max-age=0";
  } catch {
    // Ignore storage failures
  }
}

function buildProfileFromUser(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const username =
    (typeof meta.username === "string" && meta.username.trim()) ||
    user.email?.split("@")[0] ||
    "player";
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) || username;
  let localTurf: string | null = null;
  let localStreak: string | null = null;
  if (typeof window !== "undefined") {
    try {
      localTurf = localStorage.getItem(`gw_turf_${user.id}`);
      localStreak = localStorage.getItem(`gw_streak_${user.id}`);
    } catch {
      // Ignore storage failures
    }
  }
  return {
    id: user.id,
    username,
    full_name: fullName,
    avatar_url: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
    role: "player",
    referral_code:
      typeof meta.referral_code === "string" ? meta.referral_code : "",
    turf: localTurf || (typeof meta.turf === "string" ? meta.turf : "lagos"),
    streak_days: localStreak ? Number(localStreak) : 1,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  /** Fetch the profile row for an authenticated user id */
  const fetchProfile = useCallback(
    async (userId: string, fallbackUser?: User | null): Promise<Profile | null> => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (data) {
          const p = data as Profile;
          if (typeof window !== "undefined") {
            const localTurf = localStorage.getItem(`gw_turf_${userId}`);
            const localStreak = localStorage.getItem(`gw_streak_${userId}`);
            return {
              ...p,
              turf: localTurf || p.turf || "lagos",
              streak_days: localStreak ? Number(localStreak) : p.streak_days || 1,
            };
          }
          return p;
        }
      } catch {
        // Fall through to metadata-backed profile only for authenticated user
      }
      return fallbackUser ? buildProfileFromUser(fallbackUser) : null;
    },
    [supabase],
  );

  /** Refresh the profile for the currently signed-in user */
  const refreshProfile = useCallback(async () => {
    if (!state.user?.id) return;
    const profile = await fetchProfile(state.user.id, state.user);
    setState((prev) => ({
      ...prev,
      profile,
    }));
  }, [state.user, fetchProfile]);

  /** Initialize: get current session + subscribe to changes */
  useEffect(() => {
    let mounted = true;
    clearLegacyDemoStorage();

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user);
          if (!mounted) return;
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
          });
          return;
        }
      } catch {
        // Fall through to unauthenticated state
      }

      if (!mounted) return;
      setState({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });
    }

    initAuth();

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user);
        if (!mounted) return;
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
        });
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  /** Auth actions */
  const signUp = useCallback(async (payload: SignUpPayload) => {
    return await authSignUp(payload);
  }, []);

  const signIn = useCallback(async (payload: SignInPayload) => {
    await authSignIn(payload);
  }, []);

  const signInWithGoogle = useCallback(
    async (options?: { referralCode?: string; next?: string }) => {
      await authSignInWithGoogle(options);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authSignOut();
    setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [state, signUp, signIn, signInWithGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
