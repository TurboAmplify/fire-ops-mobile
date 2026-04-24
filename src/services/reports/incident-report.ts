import { supabase } from "@/integrations/supabase/client";

export interface IncidentCostRow {
  incidentId: string;
  incidentName: string;
  status: string;
  totalExpenses: number;
  expenseCount: number;
}

export async function fetchIncidentCostRows(
  organizationId: string,
  rangeStart: Date | null,
  rangeEnd: Date | null,
): Promise<IncidentCostRow[]> {
  const [incRes, expRes] = await Promise.all([
    supabase.from("incidents").select("id, name, status").eq("organization_id", organizationId),
    supabase.from("expenses")
      .select("id, amount, incident_id, date")
      .eq("organization_id", organizationId),
  ]);
  if (incRes.error) throw incRes.error;
  if (expRes.error) throw expRes.error;

  const startStr = rangeStart ? rangeStart.toISOString().slice(0, 10) : null;
  const endStr = rangeEnd ? rangeEnd.toISOString().slice(0, 10) : null;

  const map = new Map<string, IncidentCostRow>();
  (incRes.data ?? []).forEach((i: any) => {
    map.set(i.id, {
      incidentId: i.id,
      incidentName: i.name,
      status: i.status,
      totalExpenses: 0,
      expenseCount: 0,
    });
  });

  (expRes.data ?? []).forEach((e: any) => {
    if (!e.incident_id) return;
    if (startStr && e.date < startStr) return;
    if (endStr && e.date > endStr) return;
    const row = map.get(e.incident_id);
    if (!row) return;
    row.totalExpenses += Number(e.amount) || 0;
    row.expenseCount += 1;
  });

  return Array.from(map.values()).sort((a, b) => b.totalExpenses - a.totalExpenses);
}

export interface CrewRosterRow {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  active: boolean;
  qualifications: string[];
}

export async function fetchCrewRoster(organizationId: string): Promise<CrewRosterRow[]> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("id, name, role, phone, active, qualifications")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    phone: r.phone,
    active: r.active,
    qualifications: Array.isArray(r.qualifications) ? r.qualifications : [],
  }));
}
