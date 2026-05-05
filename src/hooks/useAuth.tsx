import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { queryClient } from "@/lib/query-client";
import { del } from "idb-keyval";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const LAST_USER_KEY = "fireops_last_user_id";

/**
 * Wipe every per-user piece of client state. Called whenever the signed-in
 * user changes (sign-in as different user, sign-out, or user_id mismatch).
 *
 * This is critical: without it, the previous user's React Query cache
 * (including the IndexedDB-persisted copy) and their localStorage
 * `active_org_id` can leak into the next user's first paint.
 */
async function wipeUserScopedClientState() {
  try {
    queryClient.clear();
  } catch {
    /* ignore */
  }
  try {
    await del("fireops-query-cache");
  } catch {
    /* ignore */
  }
  try {
    // Remove anything user-scoped from localStorage. Anything namespaced with
    // "fireops_" that isn't a true global preference goes here.
    const keysToWipe: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k === "fireops_active_org_id" ||
        k.startsWith("fireops_active_org_id:") ||
        k === "fireops_tutorial_completed_at" ||
        k.startsWith("fireops_impersonation") ||
        k.startsWith("fireops_user_")
      ) {
        keysToWipe.push(k);
      }
    }
    keysToWipe.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize the "last user" reference from localStorage so we can detect
    // a user-id swap on the very first auth event of a new session.
    try {
      lastUserIdRef.current = localStorage.getItem(LAST_USER_KEY);
    } catch {
      lastUserIdRef.current = null;
    }

    const handleAuth = async (event: string, session: Session | null) => {
      const newUserId = session?.user?.id ?? null;
      const prevUserId = lastUserIdRef.current;

      // Any time the identity changes (including SIGNED_OUT → null), wipe
      // per-user state BEFORE we let the rest of the app render with the
      // new identity.
      const identityChanged = newUserId !== prevUserId;
      const isSignOut = event === "SIGNED_OUT" || newUserId === null;

      if (identityChanged || isSignOut) {
        await wipeUserScopedClientState();
      }

      lastUserIdRef.current = newUserId;
      try {
        if (newUserId) localStorage.setItem(LAST_USER_KEY, newUserId);
        else localStorage.removeItem(LAST_USER_KEY);
      } catch {
        /* ignore */
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't await inside the supabase listener (avoid deadlocks).
      void handleAuth(event, session);
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      void handleAuth("INITIAL_SESSION", session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Defensive: also wipe locally in case the listener fires later.
    await wipeUserScopedClientState();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
