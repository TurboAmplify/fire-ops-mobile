import { FileText, Loader2, Sparkles, ScrollText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SignedLink } from "@/components/ui/SignedLink";

interface Props {
  incidentId: string;
}

interface RolledRO {
  id: string;
  file_url: string;
  file_name: string;
  agreement_number: string | null;
  resource_order_number: string | null;
  parsed_at: string | null;
  created_at: string;
  truck_name: string;
  truck_unit_type: string | null;
}

/**
 * Read-only roll-up of every Resource Order across all trucks on this incident.
 * Source of truth lives on each truck card — this just surfaces them in one place
 * so the incident overview shows ROs without re-uploads.
 */
export function IncidentResourceOrdersRollup({ incidentId }: Props) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["incident-resource-orders-rollup", incidentId],
    queryFn: async (): Promise<RolledRO[]> => {
      // 1. get incident_trucks for this incident with truck info
      const { data: its, error: itErr } = await supabase
        .from("incident_trucks")
        .select("id, trucks:truck_id(name, unit_type)")
        .eq("incident_id", incidentId);
      if (itErr) throw itErr;
      const itIds = (its ?? []).map((it) => it.id);
      if (itIds.length === 0) return [];

      // 2. get all resource_orders for those incident_trucks
      const { data: ros, error: roErr } = await supabase
        .from("resource_orders")
        .select(
          "id, incident_truck_id, file_url, file_name, agreement_number, resource_order_number, parsed_at, created_at"
        )
        .in("incident_truck_id", itIds)
        .order("created_at", { ascending: false });
      if (roErr) throw roErr;

      const truckById = new Map<string, { name: string; unit_type: string | null }>();
      (its ?? []).forEach((it) => {
        const t = (it.trucks as any) ?? null;
        truckById.set(it.id, {
          name: t?.name ?? "Truck",
          unit_type: t?.unit_type ?? null,
        });
      });

      return (ros ?? []).map((ro) => {
        const t = truckById.get(ro.incident_truck_id) ?? { name: "Truck", unit_type: null };
        return {
          id: ro.id,
          file_url: ro.file_url,
          file_name: ro.file_name,
          agreement_number: ro.agreement_number,
          resource_order_number: ro.resource_order_number,
          parsed_at: ro.parsed_at,
          created_at: ro.created_at,
          truck_name: t.name,
          truck_unit_type: t.unit_type,
        };
      });
    },
    enabled: !!incidentId,
  });

  return (
    <div className="rounded-xl bg-card p-4 card-shadow space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ScrollText className="h-3.5 w-3.5" />
          Resource Orders
        </p>
      </div>

      <p className="text-xs text-muted-foreground -mt-1">
        Resource Orders uploaded on each truck appear here. Manage uploads on the Trucks tab.
      </p>

      {isLoading && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!orders || orders.length === 0) && (
        <p className="text-sm text-muted-foreground py-2">No Resource Orders yet.</p>
      )}

      <div className="space-y-2">
        {orders?.map((ro) => {
          const truckLabel = ro.truck_unit_type || ro.truck_name;
          return (
            <SignedLink
              key={ro.id}
              href={ro.file_url}
              className="flex items-center gap-3 rounded-lg bg-secondary p-3 touch-target"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ro.file_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {truckLabel}
                  {ro.resource_order_number && ` · RO# ${ro.resource_order_number}`}
                  {ro.agreement_number && ` · Agreement ${ro.agreement_number}`}
                </p>
              </div>
              {ro.parsed_at && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
            </SignedLink>
          );
        })}
      </div>
    </div>
  );
}
