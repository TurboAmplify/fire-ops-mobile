import { supabase } from "@/integrations/supabase/client";

export type ActivityKind = "inspections" | "signatures" | "expenses";

export interface ActivityRow {
  id: string;
  occurred_at: string;
  primary: string;       // headline (truck name, signer name, vendor)
  secondary?: string;    // sub line (status, method, category)
  amount?: number | null;
  status?: string | null;
  notes?: string | null;
}

interface FetchOpts {
  organizationId: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
}

function isoOrNull(d: Date | null) {
  return d ? d.toISOString() : null;
}

function dateOnlyOrNull(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : null;
}

export async function fetchActivityRows(kind: ActivityKind, opts: FetchOpts): Promise<ActivityRow[]> {
  if (kind === "inspections") {
    let q = supabase
      .from("truck_inspections")
      .select("id, performed_at, performed_by_name, status, notes, trucks(name)")
      .eq("organization_id", opts.organizationId)
      .order("performed_at", { ascending: false });
    if (opts.rangeStart) q = q.gte("performed_at", isoOrNull(opts.rangeStart)!);
    if (opts.rangeEnd) q = q.lte("performed_at", isoOrNull(opts.rangeEnd)!);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      occurred_at: r.performed_at,
      primary: `${r.trucks?.name ?? "Truck"} · ${r.performed_by_name ?? "Unknown"}`,
      secondary: r.status,
      status: r.status,
      notes: r.notes,
    }));
  }

  if (kind === "signatures") {
    let q = supabase
      .from("signature_audit_log")
      .select("id, signed_at, signer_name, signer_type, method")
      .eq("organization_id", opts.organizationId)
      .order("signed_at", { ascending: false });
    if (opts.rangeStart) q = q.gte("signed_at", isoOrNull(opts.rangeStart)!);
    if (opts.rangeEnd) q = q.lte("signed_at", isoOrNull(opts.rangeEnd)!);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      occurred_at: r.signed_at,
      primary: r.signer_name ?? "Unknown",
      secondary: `${r.signer_type} · ${r.method}`,
    }));
  }

  // expenses
  let q = supabase
    .from("expenses")
    .select("id, date, amount, category, vendor, status, description")
    .eq("organization_id", opts.organizationId)
    .order("date", { ascending: false });
  if (opts.rangeStart) q = q.gte("date", dateOnlyOrNull(opts.rangeStart)!);
  if (opts.rangeEnd) q = q.lte("date", dateOnlyOrNull(opts.rangeEnd)!);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    occurred_at: r.date,
    primary: r.vendor || r.category,
    secondary: r.category,
    amount: Number(r.amount),
    status: r.status,
    notes: r.description,
  }));
}
