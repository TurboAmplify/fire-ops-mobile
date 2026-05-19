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
      // NOTE: fireops_tutorial_completed_at is intentionally NOT wiped — it's
      // a UI preference mirrored from profiles.tutorial_completed_at and
      // wiping it caused the welcome sheet to reappear on every cold load.
      const keysToWipe: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k === "fireops_active_org_id" ||
          k.startsWith("fireops_active_org_id:") ||
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

      // Ignore the INITIAL_SESSION-with-null race: onAuthStateChange often
      // fires INITIAL_SESSION before getSession() resolves the real user,
      // which used to cause a spurious wipe on every cold load.
      if (event === "INITIAL_SESSION" && newUserId === null && prevUserId) {
        return;
      }

      const identityChanged = newUserId !== prevUserId;
      const isExplicitSignOut = event === "SIGNED_OUT";

      // Only wipe when identity truly changed to a *different* user, or on
      // an explicit sign-out. First-time sign-in (prev=null → new=id) does
      // not need a wipe.
      const isNewSignIn = prevUserId === null && newUserId !== null;
      if ((identityChanged && !isNewSignIn) || isExplicitSignOut) {
        await wipeUserScopedClientState();
      }

      lastUserIdRef.current = newUserId;
      try {
        if (newUserId) localStorage.setItem(LAST_USER_KEY, newUserId);
        else if (isExplicitSignOut) localStorage.removeItem(LAST_USER_KEY);
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
