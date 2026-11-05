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

const DEFAULT_DEMO_USER: User = {
  id: "demo-naija-player",
  aud: "authenticated",
  role: "authenticated",
  email: "striker@guesswhat.ng",
  user_metadata: {
    username: "naija_striker",
    turf: "lagos",
    referral_code: "NAIJA26",
  },
  app_metadata: {},
  created_at: new Date().toISOString(),
} as unknown as User;

const DEFAULT_DEMO_PROFILE: Profile = {
  id: "demo-naija-player",
  username: "naija_striker",
  full_name: "Naija Striker",
  avatar_url: null,
  role: "player",
  referral_code: "NAIJA26",
  turf: "lagos",
  streak_days: 3,
};

function getLocalFallbackAuth(): { user: User; profile: Profile } {
  if (typeof window === "undefined") {
    return { user: DEFAULT_DEMO_USER, profile: DEFAULT_DEMO_PROFILE };
  }

  try {
    const rawUser = localStorage.getItem("gw_demo_user");
    const rawProfile = localStorage.getItem("gw_demo_profile");
    const user: User = rawUser ? JSON.parse(rawUser) : DEFAULT_DEMO_USER;
    const baseProfile: Profile = rawProfile ? JSON.parse(rawProfile) : DEFAULT_DEMO_PROFILE;
    const localTurf = localStorage.getItem(`gw_turf_${user.id}`);
    const localStreak = localStorage.getItem(`gw_streak_${user.id}`);

    return {
      user,
      profile: {
        ...baseProfile,
        turf: localTurf || baseProfile.turf || "lagos",
        streak_days: localStreak ? Number(localStreak) : baseProfile.streak_days || 3,
      },
    };
  } catch {
    return { user: DEFAULT_DEMO_USER, profile: DEFAULT_DEMO_PROFILE };
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

  /** Fetch the profile row for a given user id */
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
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
        // Fall through to local fallback
      }
      return getLocalFallbackAuth().profile;
    },
    [supabase],
  );

  /** Refresh the profile for the current user */
  const refreshProfile = useCallback(async () => {
    const activeUserId = state.user?.id ?? DEFAULT_DEMO_USER.id;
    const profile = await fetchProfile(activeUserId);
    setState((prev) => ({
      ...prev,
      user: prev.user ?? getLocalFallbackAuth().user,
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

        if (session?.user) {
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
        // Ignore network errors and use local fallback
      }

      if (!mounted) return;
      const fallback = getLocalFallbackAuth();
      setState({
        user: fallback.user,
        session: null,
        profile: fallback.profile,
        loading: false,
      });
    }

    initAuth();

    const handleLocalAuthChange = () => {
      const fallback = getLocalFallbackAuth();
      setState((prev) => ({
        ...prev,
        user: fallback.user,
        profile: fallback.profile,
        loading: false,
      }));
    };

    window.addEventListener("gw-auth-change", handleLocalAuthChange);

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
        });
      } else {
        const fallback = getLocalFallbackAuth();
        setState({
          user: fallback.user,
          session: null,
          profile: fallback.profile,
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
