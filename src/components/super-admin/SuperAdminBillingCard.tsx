import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreditCard, Clock, ShieldOff, Sparkles } from "lucide-react";
import { resolvePlan } from "@/lib/billing/resolve";
import type { OrgType, BillingStatus } from "@/lib/billing/types";

interface Props {
  orgId: string;
  orgType: OrgType;
  billingStatus: BillingStatus;
  planCode: string;
  trialEndsAt: string | null;
}

const STATUS_OPTIONS: BillingStatus[] = ["trial", "active", "read_only", "locked"];

export function SuperAdminBillingCard({ orgId, orgType, billingStatus, planCode, trialEndsAt }: Props) {
  const qc = useQueryClient();
  const [extendDays, setExtendDays] = useState("30");
  const [extendReason, setExtendReason] = useState("");
  const [newStatus, setNewStatus] = useState<BillingStatus>(billingStatus);
  const [newPlan, setNewPlan] = useState(planCode);
  const [setReason, setSetReason] = useState("");

  const resolved = resolvePlan({ orgType, billingStatus, planCode, trialEndsAt });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["super-admin", "org", orgId] });

  const extendMut = useMutation({
    mutationFn: async () => {
      const days = parseInt(extendDays, 10);
      if (!Number.isFinite(days) || days <= 0) throw new Error("Days must be a positive number");
      const { error } = await supabase.rpc("admin_extend_org_trial", {
        _org_id: orgId,
        _days: days,
        _reason: extendReason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Trial extended by ${extendDays} days`);
      setExtendReason("");
      invalidate();
    },
    onError: (e) => toast.error("Failed to extend trial", { description: (e as Error).message }),
  });

  const setBillingMut = useMutation({
    mutationFn: async (overrides?: Partial<{ status: BillingStatus; plan: string }>) => {
      const { error } = await supabase.rpc("admin_set_org_billing", {
        _org_id: orgId,
        _billing_status: overrides?.status ?? newStatus,
        _plan_code: overrides?.plan ?? newPlan,
        _trial_ends_at: null,
        _reason: setReason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Billing updated");
      setSetReason("");
      invalidate();
    },
    onError: (e) => toast.error("Failed to update billing", { description: (e as Error).message }),
  });

  const convertToPartner = () =>
    setBillingMut.mutate({
      status: "active",
      plan: orgType === "vfd" ? "vfd_partner" : orgType === "state_agency" ? "agency_standard" : "contractor_active",
    });

  const lockOrg = () => setBillingMut.mutate({ status: "locked" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Billing & plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="mt-1 font-semibold">{resolved.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
            <p className="mt-1 font-semibold">{resolved.planLabel}</p>
            <p className="text-xs text-muted-foreground">{resolved.planCode}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trial ends</p>
            <p className="mt-1 font-semibold">
              {trialEndsAt ? format(new Date(trialEndsAt), "MMM d, yyyy") : "—"}
            </p>
            {resolved.daysRemaining !== null && (
              <p className="text-xs text-muted-foreground">
                {resolved.daysRemaining > 0
                  ? `${resolved.daysRemaining} days left`
                  : `${Math.abs(resolved.daysRemaining)} days past due`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={convertToPartner}
            disabled={setBillingMut.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {orgType === "vfd" ? "Convert to VFD partner" : "Mark active"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={lockOrg}
            disabled={setBillingMut.isPending}
          >
            <ShieldOff className="h-4 w-4" />
            Lock account
          </Button>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Extend trial
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[120px]">
              <Label htmlFor="extend-days" className="text-xs">Days</Label>
              <Input
                id="extend-days"
                type="number"
                min={1}
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="extend-reason" className="text-xs">Reason (audit log)</Label>
              <Input
                id="extend-reason"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="e.g. Support call"
              />
            </div>
          </div>
          <Button size="sm" onClick={() => extendMut.mutate()} disabled={extendMut.isPending}>
            {extendMut.isPending ? "Extending..." : "Extend trial"}
          </Button>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-semibold">Manual override</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as BillingStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-plan" className="text-xs">Plan code</Label>
              <Input
                id="new-plan"
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
              />
            </div>
          </div>
          <Textarea
            value={setReason}
            onChange={(e) => setSetReason(e.target.value)}
            rows={2}
            placeholder="Reason (audit log)"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBillingMut.mutate(undefined)}
            disabled={setBillingMut.isPending}
          >
            {setBillingMut.isPending ? "Saving..." : "Apply override"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
