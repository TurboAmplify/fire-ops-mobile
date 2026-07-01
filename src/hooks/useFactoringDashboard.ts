import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";

export interface DashboardSubmission {
  id: string;
  incident_id: string;
  incident_name: string;
  incident_start_date: string | null;
  incident_end_date: string | null;
  schedule_number: number;
  total_amount: number;
  reserve_amount: number;
  advanced_amount: number;
  account_count: number;
  submitted_at: string;
  reserve_released_at: string | null;
}

export interface IncidentGroup {
  incident_id: string;
  incident_name: string;
  incident_start_date: string | null;
  incident_end_date: string | null;
  submissions: DashboardSubmission[];
  totals: {
    submitted: number;
    advanced: number;
    reserveHeld: number;
    released: number;
    count: number;
  };
}

export interface DashboardData {
  submissions: DashboardSubmission[];
  groups: IncidentGroup[];
  totals: {
    submitted: number;
    advanced: number;
    reserveHeld: number;
    released: number;
    count: number;
  };
}

export function useFactoringDashboard() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;

  return useQuery<DashboardData>({
    queryKey: ["factoring-dashboard", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data, error }, { data: allIncidents, error: incAllErr }] = await Promise.all([
        supabase
          .from("factoring_submissions" as any)
          .select(
            "id, incident_id, schedule_number, total_amount, reserve_amount, account_count, submitted_at, reserve_released_at",
          )
          .eq("organization_id", orgId!)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("incidents")
          .select("id, name, start_date")
          .eq("organization_id", orgId!)
          .order("start_date", { ascending: false, nullsFirst: false }),
      ]);
      if (error) throw error;
      if (incAllErr) throw incAllErr;

      const raw = (data as any[]) ?? [];
      const incidentMap = new Map<string, { name: string; start_date: string | null }>();
      for (const i of (allIncidents as any[]) ?? []) {
        incidentMap.set(i.id, { name: i.name, start_date: i.start_date ?? null });
      }

      const rows: DashboardSubmission[] = raw.map((r) => {
        const total = Number(r.total_amount) || 0;
        const reserve = Number(r.reserve_amount) || 0;
        const inc = incidentMap.get(r.incident_id);
        return {
          id: r.id,
          incident_id: r.incident_id,
          incident_name: inc?.name ?? "Unknown incident",
          incident_start_date: inc?.start_date ?? null,
          incident_end_date: null,
          schedule_number: r.schedule_number,
          total_amount: total,
          reserve_amount: reserve,
          advanced_amount: Math.max(0, total - reserve),
          account_count: r.account_count ?? 0,
          submitted_at: r.submitted_at,
          reserve_released_at: r.reserve_released_at ?? null,
        };
      });

      // Seed every org incident so admin sees full status
      const byIncident = new Map<string, IncidentGroup>();
      for (const [id, inc] of incidentMap.entries()) {
        byIncident.set(id, {
          incident_id: id,
          incident_name: inc.name,
          incident_start_date: inc.start_date,
          incident_end_date: null,
          submissions: [],
          totals: { submitted: 0, advanced: 0, reserveHeld: 0, released: 0, count: 0 },
        });
      }
      for (const s of rows) {
        let g = byIncident.get(s.incident_id);
        if (!g) {
          g = {
            incident_id: s.incident_id,
            incident_name: s.incident_name,
            incident_start_date: s.incident_start_date,
            incident_end_date: s.incident_end_date,
            submissions: [],
            totals: { submitted: 0, advanced: 0, reserveHeld: 0, released: 0, count: 0 },
          };
          byIncident.set(s.incident_id, g);
        }
        g.submissions.push(s);
        g.totals.submitted += s.total_amount;
        g.totals.advanced += s.advanced_amount;
        g.totals.count += 1;
        if (s.reserve_released_at) g.totals.released += s.reserve_amount;
        else g.totals.reserveHeld += s.reserve_amount;
      }

      const groups = Array.from(byIncident.values()).sort((a, b) => {
        // Incidents with submissions first (by total desc), then by start date desc
        if (a.totals.count !== b.totals.count) {
          if (a.totals.count === 0) return 1;
          if (b.totals.count === 0) return -1;
        }
        if (a.totals.submitted !== b.totals.submitted) return b.totals.submitted - a.totals.submitted;
        const ad = a.incident_start_date ? Date.parse(a.incident_start_date) : 0;
        const bd = b.incident_start_date ? Date.parse(b.incident_start_date) : 0;
        return bd - ad;
      });

      const totals = rows.reduce(
        (acc, s) => {
          acc.submitted += s.total_amount;
          acc.advanced += s.advanced_amount;
          acc.count += 1;
          if (s.reserve_released_at) acc.released += s.reserve_amount;
          else acc.reserveHeld += s.reserve_amount;
          return acc;
        },
        { submitted: 0, advanced: 0, reserveHeld: 0, released: 0, count: 0 },
      );

      return { submissions: rows, groups, totals };
    },
  });
}

export function useSetReserveReleased() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useMutation({
    mutationFn: async ({ id, released }: { id: string; released: boolean }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const patch = released
        ? { reserve_released_at: new Date().toISOString(), reserve_released_by: userRes.user?.id ?? null }
        : { reserve_released_at: null, reserve_released_by: null };
      const { error } = await supabase
        .from("factoring_submissions" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["factoring-dashboard", orgId] });
      toast({
        title: vars.released ? "Reserve marked released" : "Reserve marked held",
      });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message ?? "Try again", variant: "destructive" });
    },
  });
}
