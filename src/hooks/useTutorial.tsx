import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getStepsForRole, type TutorialStep } from "@/components/tutorial/tutorial-steps";
import { toast } from "sonner";

// Persistent guard so the welcome sheet auto-opens at most ONCE per device,
// regardless of preview-iframe remounts, cache wipes, or sessionStorage
// resets. Users can still replay manually from the help icon.
const LS_AUTO_SHOWN_KEY = "fireops_tutorial_auto_shown_at";

interface TutorialContextValue {
  isOpen: boolean;
  isMinimized: boolean;
  stepIndex: number;
  totalSteps: number;
  steps: TutorialStep[];
  userFirstName: string | null;
  start: () => void;
  close: () => void;
  next: () => void;
  back: () => void;
  goTo: (index: number) => void;
  minimize: () => void;
  resume: () => void;
  complete: () => void;
  /** Kept for backward compatibility. Auto-start now runs inside the provider. */
  maybeAutoStart: () => void;
}

const noop = () => {};
const DEFAULT_TUTORIAL_CONTEXT: TutorialContextValue = {
  isOpen: false,
  isMinimized: false,
  stepIndex: 0,
  totalSteps: 0,
  steps: [],
  userFirstName: null,
  start: noop,
  close: noop,
  next: noop,
  back: noop,
  goTo: noop,
  minimize: noop,
  resume: noop,
  complete: noop,
  maybeAutoStart: noop,
};

const TUTORIAL_CONTEXT_KEY = "__fireops_tutorial_context__" as const;
type TutorialContextGlobal = typeof globalThis & {
  __fireops_tutorial_context__?: ReturnType<typeof createContext<TutorialContextValue | null>>;
};

// Keep one context object across Vite hot updates. The preview loop was caused
// by a split-brain HMR state: TutorialProvider came from one module instance,
// while Dashboard/useTutorial came from a newer one, so React saw no provider.
const TutorialContext =
  ((globalThis as TutorialContextGlobal)[TUTORIAL_CONTEXT_KEY] ??=
    createContext<TutorialContextValue | null>(null));

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { membership, loading: orgLoading } = useOrganization();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const autoCheckedRef = useRef(false);
  const isSuperAdminRoute = location.pathname.startsWith("/super-admin");

  const steps = useMemo(() => getStepsForRole(membership?.role), [membership?.role]);
  const totalSteps = steps.length;

  const persistComplete = useCallback(async () => {
    try {
      localStorage.setItem(LS_AUTO_SHOWN_KEY, new Date().toISOString());
    } catch {
      // ignore storage errors
    }
    if (user?.id) {
      try {
        await supabase
          .from("profiles")
          .update({ tutorial_completed_at: new Date().toISOString() })
          .eq("id", user.id);
      } catch (err) {
        console.warn("Failed to persist tutorial completion:", err);
      }
    }
  }, [user?.id]);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    // Mark as seen so it doesn't auto-open on every sign-in.
    // Users can always replay from the Help / Settings entry point.
    void persistComplete();
  }, [persistComplete]);

  const minimize = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(true);
  }, []);

  const resume = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setStepIndex(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [totalSteps],
  );

  const complete = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    void persistComplete();
    // One-time discoverability nudge.
    try {
      toast.success("Tour complete", {
        description: "Replay anytime from the help icon on the Dashboard.",
        duration: 4500,
      });
    } catch {
      // ignore toast failures (SSR / no provider)
    }
  }, [persistComplete]);

  // Holds the pending auto-open timer so we can cancel it on unmount or
  // user change. Without this, a remount mid-delay (e.g. preview-shell
  // reload) re-armed the timer and re-opened the sheet — what users saw as
  // the screen "jumping".
  const autoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAutoStartCheck = useCallback(async () => {
    if (autoCheckedRef.current) return;
    if (isSuperAdminRoute) return;
    if (!user?.id) return;
    if (orgLoading) return;
    if (!membership?.organizationId) return;
    autoCheckedRef.current = true;

    // Fast-path: already auto-shown / completed on this device.
    try {
      if (localStorage.getItem(LS_AUTO_SHOWN_KEY)) return;
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("tutorial_completed_at, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) return;

      if (data?.full_name) {
        const first = data.full_name.trim().split(/\s+/)[0];
        if (first) setUserFirstName(first);
      }

      if (data?.tutorial_completed_at) {
        try {
          localStorage.setItem(LS_AUTO_SHOWN_KEY, data.tutorial_completed_at);
        } catch {
          // ignore
        }
        return;
      }

      // Persistently mark as auto-shown BEFORE opening so any remount
      // during the brief delay can't re-trigger.
      try {
        localStorage.setItem(LS_AUTO_SHOWN_KEY, new Date().toISOString());
      } catch {
        // ignore
      }

      // Not completed — auto-open after a brief delay so the page settles.
      if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = setTimeout(() => {
        autoOpenTimerRef.current = null;
        setStepIndex(0);
        setIsMinimized(false);
        setIsOpen(true);
      }, 400);
    } catch (err) {
      console.warn("Tutorial auto-start check failed:", err);
    }
  }, [user?.id, orgLoading, membership?.organizationId, isSuperAdminRoute]);

  // Super-admin is an operations console, not a field-user first-run flow.
  // Never let the app tour sit over it; that looked like a repeated loading
  // loop because the route had actually loaded behind a blocking sheet.
  useEffect(() => {
    if (!isSuperAdminRoute) return;
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
    setIsOpen(false);
    setIsMinimized(false);
    autoCheckedRef.current = true;
  }, [isSuperAdminRoute]);

  // Track the previous signed-in user id so we only reset the auto-check
  // when the identity truly changes from one user to a different user.
  // Transitions involving null (initial auth event, brief sign-out blips)
  // must NOT re-arm auto-open — that's how the sheet kept re-appearing.
  const prevSignedInUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const newId = user?.id ?? null;
    const prev = prevSignedInUserIdRef.current;
    if (newId && prev && newId !== prev) {
      autoCheckedRef.current = false;
      setUserFirstName(null);
      // Different user on this device → allow auto-open again.
      try {
        localStorage.removeItem(LS_AUTO_SHOWN_KEY);
      } catch {
        // ignore
      }
    }
    if (newId) prevSignedInUserIdRef.current = newId;
  }, [user?.id]);

  // Auto-start runs from the provider so it fires once per session,
  // but only when the user is actually on the Dashboard. Auto-opening on
  // arbitrary routes hides content behind a bottom sheet whose scroll lock
  // freezes the whole page.
  useEffect(() => {
    if (isSuperAdminRoute) return;
    if (location.pathname !== "/") return;
    if (!user?.id) return;
    if (orgLoading) return;
    if (!membership?.organizationId) return;
    void runAutoStartCheck();
    return () => {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
  }, [user?.id, orgLoading, membership?.organizationId, runAutoStartCheck, isSuperAdminRoute, location.pathname]);

  // Safety net: if the user navigates away while the sheet is open, minimize
  // it. Radix's scroll lock stays active as long as `open` is true, which
  // would leave every other page unscrollable.
  const lastPathRef = useRef(location.pathname);
  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      if (isOpen) {
        setIsOpen(false);
        setIsMinimized(true);
      }
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname, isOpen]);

  // Backward-compat no-op (Dashboard used to call this).
  const maybeAutoStart = useCallback(() => {
    void runAutoStartCheck();
  }, [runAutoStartCheck]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      isOpen,
      isMinimized,
      stepIndex,
      totalSteps,
      steps,
      userFirstName,
      start,
      close,
      next,
      back,
      goTo,
      minimize,
      resume,
      complete,
      maybeAutoStart,
    }),
    [
      isOpen,
      isMinimized,
      stepIndex,
      totalSteps,
      steps,
      userFirstName,
      start,
      close,
      next,
      back,
      goTo,
      minimize,
      resume,
      complete,
      maybeAutoStart,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  // Fail soft during preview/HMR module swaps. A missing provider should never
  // take down Dashboard and trigger the preview reload loop.
  return ctx ?? DEFAULT_TUTORIAL_CONTEXT;
}
