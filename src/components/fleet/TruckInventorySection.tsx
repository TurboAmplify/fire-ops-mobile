import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  useDefaultInspectionTemplate,
  useInspectionTemplateItems,
  useTruckInspections,
} from "@/hooks/useInspections";
import { useOrganization } from "@/hooks/useOrganization";
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

export function TruckInventorySection({ truckId, truckName }: Props) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const { data: template } = useDefaultInspectionTemplate(orgId, "inventory");
  const { data: templateItems } = useInspectionTemplateItems(template?.id);
  const { data: allInspections } = useTruckInspections(truckId);
  const [runnerOpen, setRunnerOpen] = useState(false);

  const itemCount = templateItems?.length ?? 0;

  // Filter to inventory inspections only (by template_id match)
  const inventoryInspections = (allInspections ?? []).filter(
    (i) => template && i.template_id === template.id,
  );
  const last = inventoryInspections[0] ?? null;
  const recent = inventoryInspections.slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Inventory Check
        </h3>
        <Link to="/settings/org" className="text-[11px] font-medium text-muted-foreground active:text-foreground">
          Edit list
        </Link>
      </div>

      <div className="rounded-xl bg-card p-4 space-y-3">
        {!template ? (
          <div className="text-sm text-muted-foreground">
            No inventory list set up yet.
            <Link to="/settings/org" className="ml-1 text-primary font-medium">Create one</Link>
          </div>
        ) : last ? (
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              last.status === "issues" ? "bg-warning/15" : "bg-success/15"
            }`}>
              {last.status === "issues" ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {last.status === "issues" ? "Items missing" : "Inventory complete"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last checked {formatRelative(last.performed_at)}
                {last.performed_by_name ? ` by ${last.performed_by_name}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">No inventory check yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Run a check to confirm gear on truck.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setRunnerOpen(true)}
          disabled={!template || itemCount === 0}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground touch-target disabled:opacity-50"
        >
          <Package className="h-4 w-4" />
          Run Inventory Check
          {itemCount > 0 && <span className="opacity-80">· {itemCount} items</span>}
        </button>
      </div>

      {recent.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Recent
          </p>
          <div className="rounded-xl bg-card divide-y divide-border overflow-hidden">
            {recent.map((insp) => (
              <div key={insp.id} className="flex items-center gap-3 px-3 py-2.5">
                {insp.status === "issues" ? (
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
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
                  insp.status === "issues" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                }`}>
                  {insp.status === "issues" ? "missing" : "complete"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TruckInspectionRunner
        open={runnerOpen}
        onOpenChange={setRunnerOpen}
        truckId={truckId}
        truckName={truckName}
        mode="inventory"
      />
    </section>
  );
}
