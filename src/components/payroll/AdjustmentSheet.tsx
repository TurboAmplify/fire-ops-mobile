import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIncidents } from "@/hooks/useIncidents";
import { useCreatePayrollAdjustment } from "@/hooks/usePayrollAdjustments";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  crewMemberId: string;
  crewMemberName: string;
  payMethod?: "hourly" | "daily";
  defaultIncidentId?: string | null;
}

export function AdjustmentSheet({
  open,
  onOpenChange,
  crewMemberId,
  crewMemberName,
  payMethod,
  defaultIncidentId,
}: Props) {
  const { data: incidents } = useIncidents();
  const create = useCreatePayrollAdjustment();
  const { toast } = useToast();

  const isDaily = payMethod === "daily";
  // Daily crew can't add "hours" — force flat
  const [type, setType] = useState<"hours" | "flat">(isDaily ? "flat" : "hours");
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [incidentId, setIncidentId] = useState<string>(defaultIncidentId ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const reset = () => {
    setType(isDaily ? "flat" : "hours");
    setHours("");
    setAmount("");
    setReason("");
    setIncidentId(defaultIncidentId ?? "");
    setDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Add a note explaining the adjustment.", variant: "destructive" });
      return;
    }
    if (type === "hours") {
      const h = Number(hours);
      if (!h || h <= 0) {
        toast({ title: "Hours required", description: "Enter a positive number of hours.", variant: "destructive" });
        return;
      }
    } else {
      const a = Number(amount);
      if (!a || a <= 0) {
        toast({ title: "Amount required", description: "Enter a positive dollar amount.", variant: "destructive" });
        return;
      }
    }

    try {
      await create.mutateAsync({
        crew_member_id: crewMemberId,
        incident_id: incidentId || null,
        adjustment_date: date,
        adjustment_type: type,
        hours: type === "hours" ? Number(hours) : null,
        amount: type === "flat" ? Number(amount) : null,
        reason: reason.trim(),
      });
      toast({ title: "Adjustment added", description: `Saved for ${crewMemberName}.` });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Add Payroll Adjustment</SheetTitle>
          <p className="text-xs text-muted-foreground">
            For <span className="font-semibold text-foreground">{crewMemberName}</span>. Does not affect shift tickets.
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Incident (optional)</Label>
            <select
              value={incidentId}
              onChange={(e) => setIncidentId(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
            >
              <option value="">— None / org-wide —</option>
              {incidents?.map((inc) => (
                <option key={inc.id} value={inc.id}>{inc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isDaily}
                onClick={() => setType("hours")}
                className={`rounded-xl border px-3 py-3 text-sm font-medium touch-target transition ${
                  type === "hours"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                } ${isDaily ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Extra Hours
              </button>
              <button
                type="button"
                onClick={() => setType("flat")}
                className={`rounded-xl border px-3 py-3 text-sm font-medium touch-target transition ${
                  type === "flat"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                Flat Amount
              </button>
            </div>
            {isDaily && (
              <p className="text-[11px] text-muted-foreground">
                Daily-rate crew use Flat Amount only (no hourly multiplier).
              </p>
            )}
          </div>

          {type === "hours" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Hours</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                placeholder="e.g. 2"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Paid at base rate, no overtime, no H&amp;W.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Amount ($)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="e.g. 100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="e.g. Owner approved extra hour/shift for Coyote Flats"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown on paystub and in audit log.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border bg-card px-3 py-3 text-sm font-medium touch-target"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={create.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground touch-target disabled:opacity-60"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
