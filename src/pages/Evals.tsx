import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, ClipboardCheck, Loader2, ChevronRight, Users, UserPlus, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvals, useCreateEval } from "@/hooks/useEvals";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useOrganization } from "@/hooks/useOrganization";
import { handleMutationError } from "@/lib/offline-guard";
import {
  DIRECTION_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  newEvalToken,
  type EvalDirection,
  type EvalStatus,
} from "@/lib/eval-225";
import { getLocalDateString } from "@/lib/local-date";

type Filter = "open" | "complete" | "all";

const NEW_OPTIONS: { direction: EvalDirection; title: string; blurb: string; icon: typeof Users }[] = [
  {
    direction: "internal",
    title: "Rate one of our crew",
    blurb: "You fill it out and review it with them on the spot.",
    icon: Users,
  },
  {
    direction: "outward",
    title: "Rate someone outside our org",
    blurb: "You fill it out, then text them the link to sign.",
    icon: UserPlus,
  },
  {
    direction: "inbound_request",
    title: "Ask an outside supervisor to rate our crew",
    blurb: "Text them a link — they fill it out and sign, no app needed.",
    icon: Send,
  },
];

export default function Evals() {
  const navigate = useNavigate();
  const { membership } = useOrganization();
  const { data: evals, isLoading, error } = useEvals();
  const { data: crew } = useCrewMembers();
  const create = useCreateEval();
  const [filter, setFilter] = useState<Filter>("open");
  const [picking, setPicking] = useState(false);
  const [direction, setDirection] = useState<EvalDirection | null>(null);
  const [subjectName, setSubjectName] = useState("");

  const rows = useMemo(() => {
    const list = evals ?? [];
    if (filter === "all") return list;
    if (filter === "complete") return list.filter((e) => e.status === "complete");
    return list.filter((e) => e.status !== "complete");
  }, [evals, filter]);

  const start = async (dir: EvalDirection, name: string, crewMemberId?: string | null) => {
    try {
      const row = await create.mutateAsync({
        direction: dir,
        status: dir === "inbound_request" ? "awaiting_rater" : "draft",
        subject_name: name.trim() || "Unnamed",
        subject_crew_member_id: crewMemberId ?? null,
        subject_home_unit: dir === "outward" ? null : membership?.organizationName ?? null,
        assignment_from: getLocalDateString(),
        assignment_to: getLocalDateString(),
        work_category: "hot_line",
        ratings: {},
        public_token: newEvalToken(),
      });
      setPicking(false);
      setDirection(null);
      setSubjectName("");
      navigate(`/evals/${row.id}`);
    } catch (err) {
      handleMutationError(err, "Could not start the eval");
    }
  };

  return (
    <AppShell title="Evaluations">
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          {(["open", "complete", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h-11 flex-1 rounded-xl text-xs font-bold capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground card-shadow"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPicking(true)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground"
        >
          <Plus className="h-5 w-5" /> New evaluation
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-card p-6 text-center card-shadow">
            <p className="text-sm font-semibold">Couldn't load evaluations</p>
            <p className="mt-1 text-xs text-muted-foreground">Check your signal and pull to refresh.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center card-shadow">
            <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-semibold">No evaluations {filter === "open" ? "open" : "yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ICS-225 performance ratings you create or request will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/evals/${e.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left card-shadow active:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.subject_name || "Unnamed"}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {[e.fire_name, e.fire_position].filter(Boolean).join(" · ") ||
                      DIRECTION_LABELS[e.direction as EvalDirection]}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_CLASSES[e.status as EvalStatus]
                      }`}
                    >
                      {STATUS_LABELS[e.status as EvalStatus]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {e.created_at ? format(new Date(e.created_at), "MMM d, yyyy") : ""}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={picking}
        onOpenChange={(o) => {
          if (!o) {
            setPicking(false);
            setDirection(null);
            setSubjectName("");
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[max(1rem,var(--app-safe-bottom))]">
          <SheetHeader>
            <SheetTitle>{direction ? "Who is being rated?" : "New evaluation"}</SheetTitle>
          </SheetHeader>

          {!direction ? (
            <div className="mt-4 space-y-2">
              {NEW_OPTIONS.map((o) => (
                <button
                  key={o.direction}
                  onClick={() => setDirection(o.direction)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left card-shadow active:bg-secondary/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <o.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{o.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{o.blurb}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          ) : direction === "outward" ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name of person being rated
                </Label>
                <Input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Full name"
                  className="h-12 text-base"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  if (!subjectName.trim()) {
                    toast.error("Enter a name first");
                    return;
                  }
                  start("outward", subjectName);
                }}
                disabled={create.isPending}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
              >
                {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Start eval
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {(crew ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No crew members yet — add crew first.
                </p>
              ) : (
                (crew ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => start(direction, c.name, c.id)}
                    disabled={create.isPending}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-card px-4 text-left card-shadow active:bg-secondary/40 disabled:opacity-60"
                  >
                    <span className="flex-1 text-sm font-semibold">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.role ?? ""}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
