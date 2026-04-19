import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TUTORIAL_STEPS } from "@/components/tutorial/tutorial-steps";

const LS_KEY = "fireops_tutorial_completed_at";

interface TutorialContextValue {
  isOpen: boolean;
  stepIndex: number;
  totalSteps: number;
  start: () => void;
  close: () => void;
  next: () => void;
  back: () => void;
  complete: () => void;
  maybeAutoStart: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoCheckedRef = useRef(false);

  const totalSteps = TUTORIAL_STEPS.length;

  const start = useCallback(() => {
    setStepIndex(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

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
    void persistComplete();
  }, [persistComplete]);

  const maybeAutoStart = useCallback(async () => {
    if (autoCheckedRef.current) return;
    autoCheckedRef.current = true;

    if (!user?.id) return;

    // Fast-path: localStorage
    try {
      if (localStorage.getItem(LS_KEY)) return;
    } catch {
      // ignore
    }

    // Authoritative check
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("tutorial_completed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error) return;
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
        setIsOpen(true);
      }, 600);
    } catch (err) {
      console.warn("Tutorial auto-start check failed:", err);
    }
  }, [user?.id]);

  // Reset auto-check when user changes
  useEffect(() => {
    autoCheckedRef.current = false;
  }, [user?.id]);

  const value = useMemo<TutorialContextValue>(
    () => ({ isOpen, stepIndex, totalSteps, start, close, next, back, complete, maybeAutoStart }),
    [isOpen, stepIndex, totalSteps, start, close, next, back, complete, maybeAutoStart],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
