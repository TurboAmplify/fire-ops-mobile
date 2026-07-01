import { AppShell } from "@/components/AppShell";
import { useFactoringDashboard } from "@/hooks/useFactoringDashboard";
import { useFactoringEnabled } from "@/hooks/useFactoring";
import { FactoringKpiCards } from "@/components/factoring/FactoringKpiCards";
import { IncidentFactoringRow } from "@/components/factoring/IncidentFactoringRow";
import { Loader2, Receipt } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function FactoringDashboard() {
  const enabledQ = useFactoringEnabled();
  const { data, isLoading, error, refetch, isRefetching } = useFactoringDashboard();
  const navigate = useNavigate();

  if (enabledQ.isLoading) {
    return (
      <AppShell title="Factoring">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (enabledQ.data === false) return <Navigate to="/more" replace />;

  return (
    <AppShell title="Factoring">
      <div className="p-4 space-y-5 pb-24">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Overview
          </h2>
          <div className="mt-2">
            <FactoringKpiCards
              submitted={data?.totals.submitted ?? 0}
              advanced={data?.totals.advanced ?? 0}
              reserveHeld={data?.totals.reserveHeld ?? 0}
              released={data?.totals.released ?? 0}
              count={data?.totals.count ?? 0}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              By Incident
            </h2>
            {isRefetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>

          {isLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">Couldn't load factoring data.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (data?.groups.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center card-shadow">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-sm font-medium">No factoring submissions yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Submit a Schedule of Accounts from an incident to see it here.
              </p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => navigate("/incidents")}>
                Go to Incidents
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data!.groups.map((g) => (
                <IncidentFactoringRow key={g.incident_id} group={g} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
