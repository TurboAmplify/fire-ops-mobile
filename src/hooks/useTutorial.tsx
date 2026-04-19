import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getStepsForRole, type TutorialStep } from "@/components/tutorial/tutorial-steps";
import { toast } from "sonner";

const LS_KEY = "fireops_tutorial_completed_at";

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

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { membership } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const autoCheckedRef = useRef(false);

  const steps = useMemo(() => getStepsForRole(membership?.role), [membership?.role]);
  const totalSteps = steps.length;

  const start = useCallback(() => {
    setStepIndex(0);
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

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

  const persistComplete = useCallback(async () => {
    try {
      localStorage.setItem(LS_KEY, new Date().toISOString());
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

  const runAutoStartCheck = useCallback(async () => {
    if (autoCheckedRef.current) return;
    if (!user?.id) return;
    autoCheckedRef.current = true;

    // Fast-path: localStorage
    try {
      if (localStorage.getItem(LS_KEY)) return;
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
          localStorage.setItem(LS_KEY, data.tutorial_completed_at);
        } catch {
          // ignore
        }
        return;
      }

      // Not completed — auto-open after a brief delay so the page settles
      setTimeout(() => {
        setStepIndex(0);
        setIsMinimized(false);
        setIsOpen(true);
      }, 700);
    } catch (err) {
      console.warn("Tutorial auto-start check failed:", err);
    }
  }, [user?.id]);

  // Reset auto-check when user changes
  useEffect(() => {
    autoCheckedRef.current = false;
    setUserFirstName(null);
  }, [user?.id]);

  // Auto-start runs from the provider so it fires once per session,
  // regardless of which route the user lands on first.
  useEffect(() => {
    if (!user?.id) return;
    void runAutoStartCheck();
  }, [user?.id, runAutoStartCheck]);

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
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
