import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DailyCrewStatus = "draft" | "awaiting_supervisor" | "complete";

export interface DailyCrewCell {
  hours: number;
  trucks: string[];
  status: DailyCrewStatus;
  ticketIds: string[];
}

export interface DailyCrewMatrix {
  dates: string[]; // sorted ascending YYYY-MM-DD
  crew: { id: string; name: string; role: string | null }[];
  // crewKey (name lowercased) -> date -> cell
  cells: Record<string, Record<string, DailyCrewCell>>;
  totalsByCrew: Record<string, number>;
  totalsByDate: Record<string, number>;
}

interface PersonnelEntry {
  date?: string;
  total?: number | string;
  operator_name?: string;
  activity_type?: string;
}

// Lower index = less finalized (worst). When merging, keep the minimum.
const STATUS_RANK: Record<DailyCrewStatus, number> = {
  draft: 0,
  awaiting_supervisor: 1,
  complete: 2,
};

function worstStatus(a: DailyCrewStatus, b: DailyCrewStatus): DailyCrewStatus {
  return STATUS_RANK[a] <= STATUS_RANK[b] ? a : b;
}

function deriveTicketStatus(t: any): DailyCrewStatus {
  if (t?.supervisor_signature_url) return "complete";
  if (t?.contractor_rep_signature_url) return "awaiting_supervisor";
  return "draft";
}

export function useIncidentDailyCrew(incidentId: string) {
  return useQuery({
    queryKey: ["incident-daily-crew", incidentId],
    enabled: !!incidentId,
    queryFn: async (): Promise<DailyCrewMatrix> => {
      // 1. Get incident_trucks for this incident
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

      // 2. Pull legacy shifts AND shift_tickets in parallel
      const [shiftsRes, ticketsRes, crewRes] = await Promise.all([
        supabase
          .from("shifts")
          .select("id, date, incident_truck_id")
          .in("incident_truck_id", itIds),
        supabase
          .from("shift_tickets")
          .select("id, incident_truck_id, personnel_entries, supervisor_signature_url, contractor_rep_signature_url")
          .in("incident_truck_id", itIds),
        // Crew lookup so we can map names to roles/ids when possible
        supabase
          .from("crew_members")
          .select("id, name, role, organization_id"),
      ]);
      if (shiftsRes.error) throw shiftsRes.error;
      if (ticketsRes.error) throw ticketsRes.error;
      if (crewRes.error) throw crewRes.error;

      const shifts = shiftsRes.data ?? [];
      const tickets = ticketsRes.data ?? [];
      const allCrew = crewRes.data ?? [];

      const crewByLowerName: Record<string, { id: string; name: string; role: string | null }> = {};
      allCrew.forEach((c: any) => {
        crewByLowerName[c.name.trim().toLowerCase()] = { id: c.id, name: c.name, role: c.role };
      });

      const cells: Record<string, Record<string, DailyCrewCell>> = {};
      const crewMap: Record<string, { id: string; name: string; role: string | null }> = {};
      const dateSet = new Set<string>();
      const totalsByCrew: Record<string, number> = {};
      const totalsByDate: Record<string, number> = {};

      const addEntry = (
        crewKey: string,
        crewInfo: { id: string; name: string; role: string | null },
        date: string,
        hours: number,
        truckName: string,
        status: DailyCrewStatus,
        ticketId: string | null,
      ) => {
        if (!date || hours <= 0) return;
        dateSet.add(date);
        crewMap[crewKey] = crewInfo;
        if (!cells[crewKey]) cells[crewKey] = {};
        if (!cells[crewKey][date]) {
          cells[crewKey][date] = { hours: 0, trucks: [], status, ticketIds: [] };
        } else {
          cells[crewKey][date].status = worstStatus(cells[crewKey][date].status, status);
        }
        cells[crewKey][date].hours += hours;
        if (!cells[crewKey][date].trucks.includes(truckName)) {
          cells[crewKey][date].trucks.push(truckName);
        }
        if (ticketId && !cells[crewKey][date].ticketIds.includes(ticketId)) {
          cells[crewKey][date].ticketIds.push(ticketId);
        }
        totalsByCrew[crewKey] = (totalsByCrew[crewKey] ?? 0) + hours;
        totalsByDate[date] = (totalsByDate[date] ?? 0) + hours;
      };

      // 3a. Legacy shift_crew rows — treat as "complete" (legacy hand-entered)
      const shiftIds = shifts.map((s) => s.id);
      const shiftMeta: Record<string, { date: string; it: string }> = {};
      shifts.forEach((s) => {
        shiftMeta[s.id] = { date: s.date, it: s.incident_truck_id };
      });

      if (shiftIds.length > 0) {
        const { data: sc, error: scErr } = await supabase
          .from("shift_crew")
          .select("shift_id, crew_member_id, hours, crew_members(id, name, role)")
          .in("shift_id", shiftIds);
        if (scErr) throw scErr;
        (sc ?? []).forEach((row: any) => {
          const meta = shiftMeta[row.shift_id];
          if (!meta) return;
          const cm = row.crew_members;
          if (!cm) return;
          const truckName = truckNameByIt[meta.it] ?? "Truck";
          addEntry(
            cm.id,
            { id: cm.id, name: cm.name, role: cm.role },
            meta.date,
            Number(row.hours) || 0,
            truckName,
            "complete",
            null,
          );
        });
      }

      // 3b. Shift ticket personnel entries (JSONB)
      tickets.forEach((t: any) => {
        const truckName = truckNameByIt[t.incident_truck_id] ?? "Truck";
        const ticketStatus = deriveTicketStatus(t);
        const entries: PersonnelEntry[] = Array.isArray(t.personnel_entries) ? t.personnel_entries : [];
        entries.forEach((e) => {
          const name = (e.operator_name ?? "").trim();
          if (!name) return;
          const date = e.date ?? "";
          const hours = Number(e.total) || 0;
          const matched = crewByLowerName[name.toLowerCase()];
          const crewKey = matched ? matched.id : `name:${name.toLowerCase()}`;
          const crewInfo = matched ?? { id: crewKey, name, role: null };
          addEntry(crewKey, crewInfo, date, hours, truckName, ticketStatus, t.id);
        });
      });

      const dates = Array.from(dateSet).sort();
      const crew = Object.values(crewMap).sort((a, b) => a.name.localeCompare(b.name));

      return { dates, crew, cells, totalsByCrew, totalsByDate };
    },
  });
}
