import { useState, useEffect } from "react";
import { useCrewMember, useCreateCrewMember, useUpdateCrewMember } from "@/hooks/useCrewMembers";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { CrewPhotoUpload } from "@/components/crew/CrewPhotoUpload";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WithholdingProfileForm, EMPTY_WITHHOLDING, type WithholdingProfileValues } from "@/components/payroll/WithholdingProfileForm";
import { useAppMode } from "@/lib/app-mode";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { CREW_ROLES } from "@/lib/crew-roles";

interface Props {
  memberId: string | null;
  onClose: () => void;
}

export function CrewMemberForm({ memberId, onClose }: Props) {
  const isEdit = !!memberId;
  const { data: existing, isLoading: loadingExisting } = useCrewMember(memberId || "");
  const createMutation = useCreateCrewMember();
  const updateMutation = useUpdateCrewMember();
  const { isAdmin, membership } = useOrganization();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [roleSelection, setRoleSelection] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<"hourly" | "daily">("hourly");
  const [hourlyRate, setHourlyRate] = useState("");
  const [hwRate, setHwRate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [withholding, setWithholding] = useState<WithholdingProfileValues>(EMPTY_WITHHOLDING);

  const mode = useAppMode();
  const showPayroll = isAdmin && mode.modules.payroll;

  // Pay rates live in an admin-only table; only admins can read or write them.
  const { data: comp } = useQuery({
    queryKey: ["crew-compensation", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from("crew_compensation" as any)
        .select("hourly_rate, hw_rate, pay_method, daily_rate, filing_status, dependents_count, use_default_withholding, federal_pct_override, extra_withholding, state_pct_override, social_security_exempt, medicare_exempt, other_deductions, notes")
        .eq("crew_member_id", memberId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin && isEdit && !!memberId,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setRole(existing.role);
      // If existing role matches a standard option, select it; otherwise treat as "Other"
      const matched = (CREW_ROLES as readonly string[]).includes(existing.role) ? existing.role : "Other";
      setRoleSelection(matched);
      setPhone(existing.phone || "");
      setActive(existing.active);
      setNotes((existing as any).notes || "");
    }
  }, [existing]);

  useEffect(() => {
    if (comp) {
      setHourlyRate(comp.hourly_rate != null ? String(comp.hourly_rate) : "");
      setHwRate(comp.hw_rate != null ? String(comp.hw_rate) : "");
      setPayMethod(comp.pay_method === "daily" ? "daily" : "hourly");
      setDailyRate(comp.daily_rate != null ? String(comp.daily_rate) : "");
      setWithholding({
        filing_status: (comp.filing_status as any) ?? "single",
        dependents_count: comp.dependents_count != null ? String(comp.dependents_count) : "0",
        use_default_withholding: comp.use_default_withholding ?? true,
        federal_pct_override: comp.federal_pct_override != null ? String(comp.federal_pct_override) : "",
        extra_withholding: comp.extra_withholding != null ? String(comp.extra_withholding) : "0",
        state_pct_override: comp.state_pct_override != null ? String(comp.state_pct_override) : "",
        social_security_exempt: !!comp.social_security_exempt,
        medicare_exempt: !!comp.medicare_exempt,
        other_deductions: comp.other_deductions != null ? String(comp.other_deductions) : "0",
        notes: comp.notes ?? "",
      });
    }
  }, [comp]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = name.trim() && role.trim() && !isPending;

  const hasChanges = isEdit
    ? !!existing && (
        name !== (existing.name || "") ||
        role !== (existing.role || "") ||
        phone !== (existing.phone || "") ||
        active !== existing.active ||
        notes !== ((existing as any).notes || "") ||
        (isAdmin && hourlyRate !== (comp?.hourly_rate != null ? String(comp.hourly_rate) : "")) ||
        (isAdmin && hwRate !== (comp?.hw_rate != null ? String(comp.hw_rate) : ""))
      )
    : !!(name || role || phone || notes || hourlyRate || hwRate);

  const handleAttemptClose = () => {
    if (hasChanges && !isPending) {
      const confirmed = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmed) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: any = {
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim() || null,
      active,
      notes: notes.trim() || null,
    };

    try {
      let savedId = memberId;
      if (isEdit && memberId) {
        await updateMutation.mutateAsync({ id: memberId, updates: payload });
      } else {
        const created = await createMutation.mutateAsync(payload);
        savedId = (created as any)?.id ?? null;
      }

      // Persist pay rates + withholding to the admin-only crew_compensation table
      if (isAdmin && savedId && membership?.organizationId) {
        const hr = hourlyRate ? parseFloat(hourlyRate) : null;
        const hw = hwRate ? parseFloat(hwRate) : null;
        const compRow: any = {
          crew_member_id: savedId,
          organization_id: membership.organizationId,
          hourly_rate: hr,
          hw_rate: hw,
        };
        if (showPayroll) {
          compRow.filing_status = withholding.filing_status;
          compRow.dependents_count = parseInt(withholding.dependents_count) || 0;
          compRow.use_default_withholding = withholding.use_default_withholding;
          compRow.federal_pct_override = withholding.federal_pct_override ? parseFloat(withholding.federal_pct_override) : null;
          compRow.extra_withholding = withholding.extra_withholding ? parseFloat(withholding.extra_withholding) : 0;
          compRow.state_pct_override = withholding.state_pct_override ? parseFloat(withholding.state_pct_override) : null;
          compRow.social_security_exempt = withholding.social_security_exempt;
          compRow.medicare_exempt = withholding.medicare_exempt;
          compRow.other_deductions = withholding.other_deductions ? parseFloat(withholding.other_deductions) : 0;
          compRow.notes = withholding.notes || null;
        }
        const { error } = await supabase.from("crew_compensation" as any).upsert(compRow, { onConflict: "crew_member_id" });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["crew-compensation"] });
        queryClient.invalidateQueries({ queryKey: ["crew-withholding-profiles"] });
      }

      toast.success(isEdit ? "Crew member updated" : "Crew member added");
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update" : "Failed to add crew member");
    }
  };

  const inputClass =
    "w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={handleAttemptClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-background animate-in slide-in-from-bottom flex flex-col"
        style={{ maxHeight: "calc(100dvh - 5rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2 shrink-0">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Crew Member" : "Add Crew Member"}</h2>
          <button onClick={handleAttemptClose} className="touch-target p-1">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {isEdit && loadingExisting ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {/* Photo upload - only for existing members */}
              {isEdit && memberId && existing && (
                <CrewPhotoUpload
                  memberId={memberId}
                  photoUrl={(existing as any).profile_photo_url ?? null}
                  name={existing.name}
                />
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="John Smith" autoFocus />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Role *</label>
                <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} placeholder="e.g. Engine Boss, Firefighter" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="555-123-4567" inputMode="tel" />
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Hourly Rate ($)</label>
                    <input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={inputClass} placeholder="0.00" inputMode="decimal" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">H&W Rate ($)</label>
                    <input type="number" step="0.01" min="0" value={hwRate} onChange={(e) => setHwRate(e.target.value)} className={inputClass} placeholder="0.00" inputMode="decimal" />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass + " min-h-[60px]"} placeholder="Certifications, availability, etc." />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-card p-3">
                <span className="text-sm font-medium">Active</span>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              {showPayroll && (
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl bg-card p-3 [&[data-state=open]>svg]:rotate-180">
                    <div className="text-left">
                      <p className="text-sm font-bold">Payroll Profile</p>
                      <p className="text-[11px] text-muted-foreground">Withholding & deductions</p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <WithholdingProfileForm values={withholding} onChange={setWithholding} />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <div className="shrink-0 px-4 pt-2 pb-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Add Crew Member"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
