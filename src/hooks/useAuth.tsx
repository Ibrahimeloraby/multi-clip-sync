import { useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppUser = Tables<"users">;

interface UseAuthReturn {
  /** Supabase auth user (null when signed out) */
  user: User | null;
  /** Current Supabase session */
  session: Session | null;
  /** App-level user row from the `users` table */
  appUser: AppUser | null;
  /** True while auth state is being determined on mount */
  loading: boolean;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Sign in / sign up with Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Sign in / sign up with Apple OAuth */
  signInWithApple: () => Promise<void>;
  /** Sign up with email + password */
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  /** Refresh the appUser row from the database */
  refreshAppUser: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch (or create) the app-level user row
  const syncAppUser = useCallback(async (authUser: User) => {
    // Try to fetch existing row
    const { data: existing, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("[useAuth] Failed to fetch user row:", error);
      return;
    }

    if (existing) {
      setAppUser(existing);
      return;
    }

    // Row doesn't exist yet — create it from auth metadata
    const meta = authUser.user_metadata ?? {};
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        email: authUser.email ?? null,
        full_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
        preferred_language: "en",
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[useAuth] Failed to create user row:", insertError);
      return;
    }

    setAppUser(created);
  }, []);

  const refreshAppUser = useCallback(async () => {
    if (!user) return;
    await syncAppUser(user);
  }, [user, syncAppUser]);

  useEffect(() => {
    // 1. Subscribe to auth state changes FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Use setTimeout to avoid Supabase deadlock in the auth callback
        setTimeout(() => syncAppUser(newSession.user), 0);
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    // 2. Get existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        syncAppUser(existing.user).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncAppUser]);

  // ── Sign in with email / password ──────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { error: null };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast.error(error.message);
        return { error };
      }
    },
    []
  );

  // ── Sign up ────────────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName ?? "" },
          },
        });
        if (error) throw error;
        toast.success("Check your email for a confirmation link.");
        return { error: null };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast.error(error.message);
        return { error };
      }
    },
    []
  );

  // ── Sign out ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    }
    setAppUser(null);
  }, []);

  // ── OAuth – Google ─────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) toast.error(error.message);
  }, []);

  // ── OAuth – Apple ──────────────────────────────────────────────────────────

  const signInWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
  }, []);

  return {
    user,
    session,
    appUser,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    refreshAppUser,
  };
}
