import { useMemo, useState } from "react";
import { Plus, Trash2, DollarSign, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import {
  useTicketAdjustments,
  useDeletePayrollAdjustment,
  useCreatePayrollAdjustment,
} from "@/hooks/usePayrollAdjustments";
import { AdjustmentSheet } from "@/components/payroll/AdjustmentSheet";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PersonnelEntry } from "@/services/shift-tickets";

interface Props {
  /** Incident this ticket belongs to. */
  incidentId: string | null | undefined;
  /** Personnel entries on the ticket — used to derive crew + dates. */
  personnelEntries: PersonnelEntry[];
  /** Org id (for adjustment writes). */
  organizationId: string;
}

/**
 * Post-script section rendered after Signatures on the shift ticket form.
 * Admin-only. Lets the org admin add discretionary pay (extra hours or a flat
 * amount) for crew on this shift WITHOUT touching the signed OF-297 personnel
 * hours. Adjustments flow into payroll as a separate line item.
 *
 * The section is hidden from non-admins entirely. The OF-297 PDF export does
 * NOT include these rows.
 */
export function PayAdjustmentsSection({
  incidentId,
  personnelEntries,
  organizationId,
}: Props) {
  const { toast } = useToast();
  const { data: crewMembers } = useCrewMembers();
  const create = useCreatePayrollAdjustment();
  const del = useDeletePayrollAdjustment();

  // Map operator names on the ticket → crew_member rows so we can attach
  // adjustments by crew_member_id (the canonical key payroll uses).
  const crewOnTicket = useMemo(() => {
    if (!crewMembers) return [];
    const matched: { id: string; name: string; payMethod?: "hourly" | "daily" }[] = [];
    const seen = new Set<string>();
    for (const entry of personnelEntries) {
      const opName = (entry.operator_name || "").trim().toLowerCase();
      if (!opName || seen.has(opName)) continue;
      const member = crewMembers.find(
        (m) => (m.name || "").trim().toLowerCase() === opName,
      );
      if (member) {
        seen.add(opName);
        matched.push({ id: member.id, name: member.name });
      }
    }
    return matched;
  }, [crewMembers, personnelEntries]);

  // Pull pay_method for these crew (so the AdjustmentSheet behaves correctly).
  const { data: comp } = useQuery({
    queryKey: ["crew-compensation-pm", crewOnTicket.map((c) => c.id).join(",")],
    enabled: crewOnTicket.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_compensation" as any)
        .select("crew_member_id, pay_method")
        .in("crew_member_id", crewOnTicket.map((c) => c.id));
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
  const payMethodFor = (crewMemberId: string): "hourly" | "daily" | undefined => {
    const row = (comp ?? []).find((c) => c.crew_member_id === crewMemberId);
    return row?.pay_method as "hourly" | "daily" | undefined;
  };

  // Date range from the ticket = unique dates across personnel entries.
  const dates = useMemo(
    () =>
      Array.from(
        new Set(personnelEntries.map((p) => p.date).filter(Boolean) as string[]),
      ),
    [personnelEntries],
  );

  const ticketAdjustments = useTicketAdjustments({
    incidentId,
    dates,
    crewMemberIds: crewOnTicket.map((c) => c.id),
  });

  // The default ticket date for new adjustments = first personnel date or today.
  const defaultDate = dates[0] || new Date().toISOString().slice(0, 10);

  const [openFor, setOpenFor] = useState<{
    crewMemberId: string;
    crewMemberName: string;
    payMethod?: "hourly" | "daily";
  } | null>(null);
  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Apply-to-all helper: open a guided sheet that lets the admin set hours +
  // memo once and creates one adjustment per crew member on the shift.
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchHours, setBatchHours] = useState("");
  const [batchAmount, setBatchAmount] = useState("");
  const [batchType, setBatchType] = useState<"hours" | "flat">("hours");
  const [batchReason, setBatchReason] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const resetBatch = () => {
    setBatchHours("");
    setBatchAmount("");
    setBatchType("hours");
    setBatchReason("");
  };

  const handleApplyToAll = async () => {
    if (!batchReason.trim()) {
      toast({ title: "Reason required", description: "Add a memo for the adjustment.", variant: "destructive" });
      return;
    }
    if (batchType === "hours") {
      const h = Number(batchHours);
      if (!h || h <= 0) {
        toast({ title: "Hours required", description: "Enter a positive number of hours.", variant: "destructive" });
        return;
      }
    } else {
      const a = Number(batchAmount);
      if (!a || a <= 0) {
        toast({ title: "Amount required", description: "Enter a positive dollar amount.", variant: "destructive" });
        return;
      }
    }
    if (crewOnTicket.length === 0) {
      toast({ title: "No matched crew", description: "No crew on this ticket are linked to crew records.", variant: "destructive" });
      return;
    }

    setBatchSubmitting(true);
    try {
      let created = 0;
      for (const c of crewOnTicket) {
        const pm = payMethodFor(c.id);
        const useFlat = batchType === "flat" || pm === "daily";
        await create.mutateAsync({
          crew_member_id: c.id,
          incident_id: incidentId || null,
          adjustment_date: defaultDate,
          adjustment_type: useFlat ? "flat" : "hours",
          hours: useFlat ? null : Number(batchHours),
          amount: useFlat ? Number(batchAmount || batchHours) : null,
          reason: batchReason.trim(),
        });
        created++;
      }
      toast({ title: "Adjustments added", description: `Created ${created} adjustment${created === 1 ? "" : "s"}.` });
      setBatchOpen(false);
      resetBatch();
    } catch (err) {
      toast({
        title: "Failed to apply",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await del.mutateAsync(deleteId);
      toast({ title: "Adjustment removed" });
    } catch (err) {
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const totalDollars = ticketAdjustments.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalHours = ticketAdjustments.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);

  // Lookup crew name by id for display
  const nameFor = (crewMemberId: string) => {
    const m = crewMembers?.find((x) => x.id === crewMemberId);
    return m?.name || "Unknown";
  };

  return (
    <section id="pay-adjustments-section" className="space-y-3">
      <div className="rounded-xl border border-warning/40 bg-warning/5 overflow-hidden">
        <div className="border-b border-warning/30 bg-warning/10 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-warning" />
              Pay Adjustments
              <span className="text-[10px] font-semibold uppercase tracking-wide text-warning/90">
                Admin / Payroll Only
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setShowCrewPicker((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1 text-[11px] font-bold text-warning-foreground touch-target"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Payroll only. Not shown on the signed OF-297. Adjustments pay at base rate (no OT, no H&amp;W).
          </p>
        </div>

        {/* Crew picker for adding a new adjustment */}
        {showCrewPicker && (
          <div className="border-b border-border bg-card p-2 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground px-1">Select crew member</p>
            {crewOnTicket.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No crew on this ticket are linked to crew records yet.
              </p>
            )}
            {crewOnTicket.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setOpenFor({ crewMemberId: c.id, crewMemberName: c.name, payMethod: payMethodFor(c.id) });
                  setShowCrewPicker(false);
                }}
                className="w-full text-left rounded-lg bg-secondary px-3 py-2 text-sm font-medium touch-target active:bg-accent/40"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* List of existing adjustments */}
        <div className="divide-y divide-border/60">
          {ticketAdjustments.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No pay adjustments on this ticket.
            </p>
          )}
          {ticketAdjustments.map((a) => (
            <div key={a.id} className="px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{nameFor(a.crew_member_id)}</p>
                    {a.adjustment_type === "hours" && a.hours != null ? (
                      <span className="text-xs font-bold text-warning">+{Number(a.hours)} hrs</span>
                    ) : a.amount != null ? (
                      <span className="text-xs font-bold text-warning">+${Number(a.amount).toFixed(2)}</span>
                    ) : null}
                  </div>
                  {a.reason && (
                    <p className="text-[11px] text-muted-foreground italic mt-0.5 leading-snug">
                      Memo: "{a.reason}"
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteId(a.id)}
                  className="rounded-lg p-2 text-destructive active:bg-destructive/10 touch-target shrink-0"
                  aria-label="Delete adjustment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: totals + apply-to-all */}
        <div className="border-t border-border bg-card px-3 py-2 space-y-2">
          {ticketAdjustments.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground uppercase tracking-wide">
                Adjustment Total
              </span>
              <span className="font-bold text-warning">
                {totalHours > 0 && <>+{totalHours} hrs</>}
                {totalHours > 0 && totalDollars > 0 && " · "}
                {totalDollars > 0 && <>+${totalDollars.toFixed(2)}</>}
              </span>
            </div>
          )}
          {crewOnTicket.length > 0 && (
            <button
              type="button"
              onClick={() => setBatchOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-warning/40 px-3 py-2 text-xs font-semibold text-warning touch-target active:bg-warning/10"
            >
              <Users className="h-3.5 w-3.5" /> Apply to all crew on shift ({crewOnTicket.length})
            </button>
          )}
        </div>
      </div>

      {/* Single-crew sheet (reuses existing AdjustmentSheet) */}
      {openFor && (
        <AdjustmentSheet
          open={!!openFor}
          onOpenChange={(v) => !v && setOpenFor(null)}
          crewMemberId={openFor.crewMemberId}
          crewMemberName={openFor.crewMemberName}
          payMethod={openFor.payMethod}
          defaultIncidentId={incidentId || null}
          prefillDate={defaultDate}
          lockContext
        />
      )}

      {/* Apply-to-all sheet */}
      <AlertDialog open={batchOpen} onOpenChange={(o) => { if (!o && !batchSubmitting) { setBatchOpen(false); resetBatch(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Adjustment to All Crew</AlertDialogTitle>
            <AlertDialogDescription>
              Creates one adjustment row per crew member on this shift ({crewOnTicket.length}).
              Daily-rate crew get a flat amount; hourly crew get extra hours at base rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBatchType("hours")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium touch-target transition ${batchType === "hours" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
              >
                Extra Hours
              </button>
              <button
                type="button"
                onClick={() => setBatchType("flat")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium touch-target transition ${batchType === "flat" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
              >
                Flat Amount
              </button>
            </div>
            {batchType === "hours" ? (
              <div className="space-y-1.5">
                <label className="text-xs">Hours each</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  placeholder="e.g. 1.5"
                  value={batchHours}
                  onChange={(e) => setBatchHours(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs">Amount each ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50.00"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs">Memo <span className="text-destructive">*</span></label>
              <textarea
                rows={3}
                placeholder="e.g. Owner approved extra hr/shift for Coyote Flats"
                value={batchReason}
                onChange={(e) => setBatchReason(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <p className="text-[10px] text-muted-foreground">Shown on each paystub and in the audit log.</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleApplyToAll(); }}
              disabled={batchSubmitting}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {batchSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create {crewOnTicket.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              The adjustment will no longer appear on the next payroll run. This action is logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
