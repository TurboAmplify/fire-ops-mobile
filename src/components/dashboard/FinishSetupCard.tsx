import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronRight, Truck, Users, X } from "lucide-react";
import { useSetupCompletion } from "@/hooks/useSetupCompletion";

const HIDDEN_KEY = "fireops_finish_setup_hidden_at";
const HIDE_DAYS = 7;

type GroupKey = "trucks" | "members" | "crews";

/**
 * Non-blocking card on the Dashboard nudging users to fill in profile details
 * for trucks/crews/members they bulk-added during onboarding. Tapping a row
 * expands it to show exactly which items are incomplete and what's missing,
 * with deep-links to fix each one. Self-hides when everything is complete.
 */
export function FinishSetupCard() {
  const navigate = useNavigate();
  const {
    totalIssues,
    incompleteTrucks,
    incompleteMembers,
    emptyCrews,
    incompleteTruckList,
    incompleteMemberList,
    emptyCrewList,
    hasAnyData,
    loading,
  } = useSetupCompletion();
  const [hidden, setHidden] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<GroupKey | null>(null);

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

  const toggle = (key: GroupKey) => {
    setExpanded((cur) => (cur === key ? null : key));
  };

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
        Tap a row to see exactly what's missing.
      </p>
      <div className="mt-2 divide-y divide-border/40">
        {incompleteTrucks > 0 && (
          <Group
            icon={Truck}
            label={`${incompleteTrucks} ${incompleteTrucks === 1 ? "engine is" : "engines are"} missing VIN, plate or insurance details`}
            isOpen={expanded === "trucks"}
            onToggle={() => toggle("trucks")}
          >
            {incompleteTruckList.map((t) => (
              <DetailRow
                key={t.id}
                title={t.name}
                missing={t.missing}
                onFix={() => navigate(`/fleet/${t.id}/edit`)}
              />
            ))}
          </Group>
        )}

        {incompleteMembers > 0 && (
          <Group
            icon={Users}
            label={`${incompleteMembers} crew ${incompleteMembers === 1 ? "member is" : "members are"} missing role or phone`}
            isOpen={expanded === "members"}
            onToggle={() => toggle("members")}
          >
            {incompleteMemberList.map((m) => (
              <DetailRow
                key={m.id}
                title={m.name}
                missing={m.missing}
                onFix={() => navigate(`/crew?edit=${m.id}`)}
              />
            ))}
          </Group>
        )}

        {emptyCrews > 0 && (
          <Group
            icon={Users}
            label={`${emptyCrews} hand ${emptyCrews === 1 ? "crew has" : "crews have"} no members assigned`}
            isOpen={expanded === "crews"}
            onToggle={() => toggle("crews")}
          >
            {emptyCrewList.map((c) => (
              <DetailRow
                key={c.id}
                title={c.name}
                missing={["No members assigned"]}
                onFix={() => navigate(`/crews`)}
              />
            ))}
          </Group>
        )}
      </div>
    </section>
  );
}

function Group({
  icon: Icon,
  label,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-amber-500/10 transition-colors touch-target"
        aria-expanded={isOpen}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/60 shrink-0">
          <Icon className="h-4 w-4 text-amber-600" />
        </div>
        <span className="flex-1 text-sm">{label}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
        )}
      </button>
      {isOpen && <div className="bg-background/40 border-t border-border/40">{children}</div>}
    </div>
  );
}

function DetailRow({
  title,
  missing,
  onFix,
}: {
  title: string;
  missing: string[];
  onFix: () => void;
}) {
  return (
    <button
      onClick={onFix}
      className="flex w-full items-center gap-3 px-4 py-2.5 pl-[60px] text-left active:bg-amber-500/10 transition-colors touch-target border-b border-border/30 last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Missing: {missing.join(", ")}
        </p>
      </div>
      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-0.5 shrink-0">
        Fix
        <ChevronRight className="h-3 w-3" />
      </span>
    </button>
  );
}
