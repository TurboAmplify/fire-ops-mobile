import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DailyCrewCell {
  hours: number;
  trucks: string[];
}

export interface DailyCrewMatrix {
  dates: string[]; // sorted ascending YYYY-MM-DD
  crew: { id: string; name: string; role: string | null }[];
  // crewId -> date -> cell
  cells: Record<string, Record<string, DailyCrewCell>>;
  totalsByCrew: Record<string, number>;
  totalsByDate: Record<string, number>;
}

export function useIncidentDailyCrew(incidentId: string) {
  return useQuery({
    queryKey: ["incident-daily-crew", incidentId],
    enabled: !!incidentId,
    queryFn: async (): Promise<DailyCrewMatrix> => {
      // 1. Get all incident_trucks for this incident
      const { data: itRows, error: itErr } = await supabase
        .from("incident_trucks")
        .select("id, truck_id, trucks(name)")
        .eq("incident_id", incidentId);
      if (itErr) throw itErr;

      const itIds = (itRows ?? []).map((r) => r.id);
      const truckNameByIt: Record<string, string> = {};
      (itRows ?? []).forEach((r: any) => {
        truckNameByIt[r.id] = r.trucks?.name ?? "Truck";
      });

      if (itIds.length === 0) {
        return { dates: [], crew: [], cells: {}, totalsByCrew: {}, totalsByDate: {} };
      }

      // 2. Get all shifts for those incident_trucks
      const { data: shifts, error: sErr } = await supabase
        .from("shifts")
        .select("id, date, incident_truck_id")
        .in("incident_truck_id", itIds);
      if (sErr) throw sErr;

      const shiftIds = (shifts ?? []).map((s) => s.id);
      const shiftMeta: Record<string, { date: string; it: string }> = {};
      (shifts ?? []).forEach((s) => {
        shiftMeta[s.id] = { date: s.date, it: s.incident_truck_id };
      });

      if (shiftIds.length === 0) {
        return { dates: [], crew: [], cells: {}, totalsByCrew: {}, totalsByDate: {} };
      }

      // 3. Get all shift_crew rows for those shifts (with crew member info)
      const { data: sc, error: scErr } = await supabase
        .from("shift_crew")
        .select("shift_id, crew_member_id, hours, crew_members(id, name, role)")
        .in("shift_id", shiftIds);
      if (scErr) throw scErr;

      // 4. Build matrix
      const cells: Record<string, Record<string, DailyCrewCell>> = {};
      const crewMap: Record<string, { id: string; name: string; role: string | null }> = {};
      const dateSet = new Set<string>();
      const totalsByCrew: Record<string, number> = {};
      const totalsByDate: Record<string, number> = {};

      (sc ?? []).forEach((row: any) => {
        const meta = shiftMeta[row.shift_id];
        if (!meta) return;
        const date = meta.date;
        const truckName = truckNameByIt[meta.it] ?? "Truck";
        const cm = row.crew_members;
        if (!cm) return;

        dateSet.add(date);
        crewMap[cm.id] = { id: cm.id, name: cm.name, role: cm.role };

        if (!cells[cm.id]) cells[cm.id] = {};
        if (!cells[cm.id][date]) cells[cm.id][date] = { hours: 0, trucks: [] };

        const hours = Number(row.hours) || 0;
        cells[cm.id][date].hours += hours;
        if (!cells[cm.id][date].trucks.includes(truckName)) {
          cells[cm.id][date].trucks.push(truckName);
        }

        totalsByCrew[cm.id] = (totalsByCrew[cm.id] ?? 0) + hours;
        totalsByDate[date] = (totalsByDate[date] ?? 0) + hours;
      });

      const dates = Array.from(dateSet).sort();
      const crew = Object.values(crewMap).sort((a, b) => a.name.localeCompare(b.name));

      return { dates, crew, cells, totalsByCrew, totalsByDate };
    },
  });
}
