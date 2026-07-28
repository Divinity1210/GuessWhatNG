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
};

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
};

type AuthActions = {
  signUp: (payload: SignUpPayload) => Promise<void>;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, role, referral_code")
        .eq("id", userId)
        .single();
      return data as Profile | null;
    },
    [supabase],
  );

  /** Refresh the profile for the current user */
  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  /** Initialize: get current session + subscribe to changes */
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let profile: Profile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }
      setState({
        user: session?.user ?? null,
        session,
        profile,
        loading: false,
      });
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      let profile: Profile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }
      setState({
        user: session?.user ?? null,
        session,
        profile,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  /** Auth actions */
  const signUp = useCallback(async (payload: SignUpPayload) => {
    await authSignUp(payload);
    // onAuthStateChange will update context automatically
  }, []);

  const signIn = useCallback(async (payload: SignInPayload) => {
    await authSignIn(payload);
    // onAuthStateChange will update context automatically
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setState((prev) => ({
      ...prev,
      user: null,
      session: null,
      profile: null,
    }));
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
