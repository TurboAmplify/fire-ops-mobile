import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, Truck, Users, X } from "lucide-react";
import { useSetupCompletion } from "@/hooks/useSetupCompletion";

const HIDDEN_KEY = "fireops_finish_setup_hidden_at";
const HIDE_DAYS = 7;

/**
 * Non-blocking card on the Dashboard nudging users to fill in profile details
 * for trucks/crews/members they bulk-added during onboarding. Self-hides when
 * everything is complete. User can dismiss for a week.
 */
export function FinishSetupCard() {
  const navigate = useNavigate();
  const { totalIssues, incompleteTrucks, incompleteMembers, emptyCrews, hasAnyData, loading } =
    useSetupCompletion();
  const [hidden, setHidden] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY);
      if (!raw) return;
      const ts = Number(raw);
      if (!Number.isFinite(ts)) return;
      const ageMs = Date.now() - ts;
      if (ageMs < HIDE_DAYS * 24 * 60 * 60 * 1000) setHidden(true);
    } catch {
      // ignore
    }
  }, []);

  if (loading || hidden || !hasAnyData || totalIssues === 0) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(HIDDEN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setHidden(true);
  };

  const items: Array<{ label: string; route: string; icon: React.ElementType; count: number }> = [];
  if (incompleteTrucks > 0) {
    items.push({
      label: `${incompleteTrucks} ${incompleteTrucks === 1 ? "engine needs" : "engines need"} details`,
      route: "/fleet",
      icon: Truck,
      count: incompleteTrucks,
    });
  }
  if (incompleteMembers > 0) {
    items.push({
      label: `${incompleteMembers} crew ${incompleteMembers === 1 ? "member is" : "members are"} incomplete`,
      route: "/crew",
      icon: Users,
      count: incompleteMembers,
    });
  }
  if (emptyCrews > 0) {
    items.push({
      label: `${emptyCrews} hand ${emptyCrews === 1 ? "crew has" : "crews have"} no members`,
      route: "/crews",
      icon: Users,
      count: emptyCrews,
    });
  }

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Finish setup</h2>
        </div>
        <button
          onClick={dismiss}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-secondary touch-target"
          aria-label="Hide for now"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <p className="px-4 pt-1 text-xs text-muted-foreground">
        Add the remaining details when you have a minute.
      </p>
      <div className="mt-2 divide-y divide-border/40">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-amber-500/10 transition-colors touch-target"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/60 shrink-0">
                <Icon className="h-4 w-4 text-amber-600" />
              </div>
              <span className="flex-1 text-sm">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
