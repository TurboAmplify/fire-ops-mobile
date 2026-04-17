import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useInspectionDue, useLastInspection, useTruckInspections, useDefaultInspectionTemplate, useInspectionTemplateItems } from "@/hooks/useInspections";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { TruckInspectionRunner } from "./TruckInspectionRunner";

interface Props {
  truckId: string;
  truckName: string;
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `today ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString())
    return `yesterday ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function TruckInspectionSection({ truckId, truckName }: Props) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const { data: orgSettings } = useOrgSettings();
  const { data: template } = useDefaultInspectionTemplate(orgId);

  // Org admins can hide the entire walk-around feature
  if (orgSettings && !orgSettings.walkaround_enabled) return null;
  const { data: templateItems } = useInspectionTemplateItems(template?.id);
  const { data: due, isLoading: loadingDue } = useInspectionDue(truckId);
  const { data: last } = useLastInspection(truckId);
  const { data: inspections, isLoading: loadingInspections } = useTruckInspections(truckId);
  const [runnerOpen, setRunnerOpen] = useState(false);

  const itemCount = templateItems?.length ?? 0;
  const recent = (inspections ?? []).slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Walk-Around Inspection
        </h3>
        <Link to="/settings/org" className="text-[11px] font-medium text-muted-foreground active:text-foreground">
          Edit template
        </Link>
      </div>

      {/* Status pill + CTA */}
      <div className="rounded-xl bg-card p-4 space-y-3">
        {loadingDue ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
          </div>
        ) : !template ? (
          <div className="text-sm text-muted-foreground">
            No inspection template set up yet.
            <Link to="/settings/org" className="ml-1 text-primary font-medium">Create one</Link>
          </div>
        ) : due ? (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Walk-around due</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {last
                  ? `Last completed ${formatRelative(last.performed_at)}${last.performed_by_name ? ` by ${last.performed_by_name}` : ""}`
                  : "Never completed"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Up to date</p>
              {last && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completed {formatRelative(last.performed_at)}
                  {last.performed_by_name ? ` by ${last.performed_by_name}` : ""}
                  {last.status === "issues" ? " · had issues" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setRunnerOpen(true)}
          disabled={!template || itemCount === 0}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground touch-target disabled:opacity-50"
        >
          <ClipboardCheck className="h-4 w-4" />
          Start Walk-Around
          {itemCount > 0 && <span className="opacity-80">· {itemCount} items</span>}
        </button>
      </div>

      {/* Recent inspections */}
      {recent.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Recent
          </p>
          <div className="rounded-xl bg-card divide-y divide-border overflow-hidden">
            {recent.map((insp) => (
              <div key={insp.id} className="flex items-center gap-3 px-3 py-2.5">
                {insp.status === "issues" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {insp.performed_by_name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(insp.performed_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  insp.status === "issues" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                }`}>
                  {insp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {loadingInspections && (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      )}

      <TruckInspectionRunner
        open={runnerOpen}
        onOpenChange={setRunnerOpen}
        truckId={truckId}
        truckName={truckName}
      />
    </section>
  );
}
