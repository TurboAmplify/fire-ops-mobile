import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isInspectionDueForTruck } from "@/services/inspections";
import { useOrganization } from "@/hooks/useOrganization";

interface DueTruck {
  truckId: string;
  truckName: string;
  incidentName: string;
}

export function InspectionDueBanner() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;

  const { data: dueTrucks } = useQuery({
    queryKey: ["dashboard-inspections-due", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<DueTruck[]> => {
      // 1) load active incidents in the org
      const { data: incidents } = await supabase
        .from("incidents")
        .select("id, name")
        .eq("organization_id", orgId!)
        .eq("status", "active");
      if (!incidents?.length) return [];
      const incidentMap = new Map(incidents.map((i: any) => [i.id, i.name]));

      // 2) load incident_trucks for those incidents
      const { data: itRows } = await supabase
        .from("incident_trucks")
        .select("id, truck_id, incident_id, trucks(name)")
        .in("incident_id", incidents.map((i: any) => i.id));
      if (!itRows?.length) return [];

      // dedupe by truck_id (a truck can be on multiple incidents — show once)
      const seen = new Set<string>();
      const candidates: DueTruck[] = [];
      for (const r of itRows as any[]) {
        if (seen.has(r.truck_id)) continue;
        seen.add(r.truck_id);
        candidates.push({
          truckId: r.truck_id,
          truckName: r.trucks?.name ?? "Truck",
          incidentName: incidentMap.get(r.incident_id) ?? "",
        });
      }

      // 3) filter for "due"
      const checks = await Promise.all(
        candidates.map(async (c) => ((await isInspectionDueForTruck(c.truckId)) ? c : null)),
      );
      return checks.filter((x): x is DueTruck => !!x);
    },
  });

  if (!dueTrucks || dueTrucks.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.15em] px-0.5">
        Action Needed
      </h2>
      <div className="rounded-2xl border border-warning/30 bg-warning/5 divide-y divide-warning/15 overflow-hidden">
        {dueTrucks.map((t) => (
          <Link
            key={t.truckId}
            to={`/fleet/${t.truckId}`}
            className="flex items-center gap-3 px-4 py-3 active:bg-warning/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate">
                Walk-around due · {t.truckName}
              </p>
              {t.incidentName && (
                <p className="text-[11px] text-muted-foreground truncate">{t.incidentName}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
