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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const UUID_RE = /^[0-9a-f-]{36}$/i;

function getStoredRealSession(): { user: User | null; profile: Profile | null } {
  if (typeof window === "undefined") {
    return { user: null, profile: null };
  }

  try {
    const rawUser = localStorage.getItem("gw_demo_user");
    const rawProfile = localStorage.getItem("gw_demo_profile");
    if (!rawUser) return { user: null, profile: null };

    const parsedUser = JSON.parse(rawUser) as User;
    if (!parsedUser?.id || parsedUser.id === "demo-naija-player" || !UUID_RE.test(parsedUser.id)) {
      localStorage.removeItem("gw_demo_user");
      localStorage.removeItem("gw_demo_profile");
      return { user: null, profile: null };
    }

    const parsedProfile = rawProfile ? (JSON.parse(rawProfile) as Profile) : null;
    return { user: parsedUser, profile: parsedProfile };
  } catch {
    return { user: null, profile: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  /** Fetch the real profile row for a given user id */
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      if (!userId || !UUID_RE.test(userId)) return null;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (data) {
          return data as Profile;
        }
      } catch {
        // Fall through to service API
      }

      try {
        const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.profile) {
            return {
              role: "player",
              ...json.profile,
            } as Profile;
          }
        }
      } catch {
        // Ignore
      }

      return getStoredRealSession().profile;
    },
    [supabase],
  );

  /** Refresh the profile for the current user */
  const refreshProfile = useCallback(async () => {
    const activeUserId = state.user?.id;
    if (!activeUserId) return;
    const profile = await fetchProfile(activeUserId);
    setState((prev) => ({
      ...prev,
      profile,
    }));
  }, [state.user, fetchProfile]);

  /** Initialize: get current session + subscribe to changes */
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user && UUID_RE.test(session.user.id)) {
          if (typeof window !== "undefined") {
            localStorage.setItem("gw_real_user_id", session.user.id);
          }
          const profile = await fetchProfile(session.user.id);
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
        // Check stored real session
      }

      if (!mounted) return;
      const stored = getStoredRealSession();
      if (stored.user?.id) {
        if (typeof window !== "undefined") {
          localStorage.setItem("gw_real_user_id", stored.user.id);
        }
        const profile = (await fetchProfile(stored.user.id)) ?? stored.profile;
        if (!mounted) return;
        setState({
          user: stored.user,
          session: null,
          profile,
          loading: false,
        });
        return;
      }

      setState({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });
    }

    initAuth();

    const handleLocalAuthChange = async () => {
      const stored = getStoredRealSession();
      if (stored.user?.id) {
        const profile = (await fetchProfile(stored.user.id)) ?? stored.profile;
        setState((prev) => ({
          ...prev,
          user: stored.user,
          profile,
          loading: false,
        }));
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });
      }
    };

    window.addEventListener("gw-auth-change", handleLocalAuthChange);

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user && UUID_RE.test(session.user.id)) {
        if (typeof window !== "undefined") {
          localStorage.setItem("gw_real_user_id", session.user.id);
        }
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
        });
      } else {
        const stored = getStoredRealSession();
        setState({
          user: stored.user,
          session: null,
          profile: stored.profile,
          loading: false,
        });
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener("gw-auth-change", handleLocalAuthChange);
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

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gw_real_user_id");
    }
    await authSignOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [state, signUp, signIn, signOut, refreshProfile],
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
