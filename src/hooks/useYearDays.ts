import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const YEAR = new Date().getFullYear();

/** Distinct days worked this year, keyed by crew_member_id. */
export function useCrewDaysWorked(year: number = YEAR) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["crew_days_worked", orgId, year],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_crew_days_worked", {
        _org_id: orgId,
        _year: year,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { crew_member_id: string; days: number }) => {
        map[r.crew_member_id] = Number(r.days) || 0;
      });
      return map;
    },
  });
}

/** Distinct days out this year, keyed by truck_id. */
export function useTruckDaysOut(year: number = YEAR) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["truck_days_out", orgId, year],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_truck_days_out", {
        _org_id: orgId,
        _year: year,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { truck_id: string; days: number }) => {
        map[r.truck_id] = Number(r.days) || 0;
      });
      return map;
    },
  });
}

export const CURRENT_YEAR = YEAR;
