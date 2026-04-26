import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flame, Building2, ArrowRight, Users, Briefcase, Shield, Landmark, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Navigate } from "react-router-dom";
import type { OrgType } from "@/lib/app-mode";
import type { OperationType } from "@/lib/operation-type";
import { showsEngines, showsHandCrews } from "@/lib/operation-type";
import { OperationTypeStep } from "@/components/onboarding/OperationTypeStep";
import { QuickResourcesStep } from "@/components/onboarding/QuickResourcesStep";
import { QuickCrewMembersStep } from "@/components/onboarding/QuickCrewMembersStep";
import { ReadyStep } from "@/components/onboarding/ReadyStep";
import { createCrewsBulk } from "@/services/crews";

const ORG_TYPE_OPTIONS: Array<{
  value: OrgType;
  title: string;
  desc: string;
  icon: React.ElementType;
}> = [
  { value: "contractor", title: "Contractor", desc: "Wildland fire contracting business with billable trucks and crews.", icon: Briefcase },
  { value: "vfd", title: "Volunteer Fire Department", desc: "Local response, structure, EMS — with optional resource-order assignments.", icon: Shield },
  { value: "state_agency", title: "State or Local Agency", desc: "Government or agency crew using internal time reporting.", icon: Landmark },
];

type Step = "type" | "details" | "operation" | "resources" | "members" | "ready";

const STEP_ORDER: Step[] = ["type", "details", "operation", "resources", "members", "ready"];

export default function OrgSetup() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: orgLoading, refetch } = useOrganization();
  const { isPlatformAdmin, loading: paLoading } = usePlatformAdmin();
  const { isImpersonating } = useImpersonation();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("contractor");
  const [acceptsAssignments, setAcceptsAssignments] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>("engine");
  const [engineNames, setEngineNames] = useState<string[]>([]);
  const [crewNames, setCrewNames] = useState<string[]>([]);
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("type");
  const [submitting, setSubmitting] = useState(false);
  const [orgCreated, setOrgCreated] = useState(false);

  const [pendingInvite, setPendingInvite] = useState<{ id: string; organization_id: string; role: string; orgName?: string } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  useEffect(() => {
    if (!user) { setCheckingInvite(false); return; }
    (async () => {
      try {
        const { data: invite } = await supabase
          .from("organization_invites")
          .select("id, organization_id, role, organizations(name)")
          .eq("email", user.email ?? "")
          .eq("status", "pending")
          .maybeSingle();
        if (invite) {
          setPendingInvite({
            id: invite.id,
            organization_id: invite.organization_id,
            role: invite.role,
            orgName: (invite as any).organizations?.name,
          });
        }
      } catch { /* ignore */ } finally {
        setCheckingInvite(false);
      }
    })();
  }, [user?.id]);

  if (authLoading || orgLoading || paLoading || checkingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  // Once the org is created and quick-setup is done, head to Dashboard.
  if (membership && orgCreated && step === "ready") return <Navigate to="/" replace />;
  if (membership && !orgCreated) return <Navigate to="/" replace />;
  if (isPlatformAdmin && !isImpersonating && !membership) return <Navigate to="/super-admin" replace />;

  const handleAcceptInvite = async () => {
    if (!pendingInvite || !user) return;
    setSubmitting(true);
    try {
      await supabase.from("organization_members").insert({
        organization_id: pendingInvite.organization_id,
        user_id: user.id,
        role: pendingInvite.role,
      });
      await supabase.from("organization_invites").update({ status: "accepted" }).eq("id", pendingInvite.id);
      toast({ title: "Joined organization", description: "You've been added to your team." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const createOrgIfNeeded = async (): Promise<string | null> => {
    if (orgCreated && membership) return membership.organizationId;
    const { data, error: rpcError } = await supabase.rpc("create_organization_with_owner" as any, {
      _name: companyName.trim(),
      _org_type: orgType,
      _accepts_assignments: orgType === "vfd" ? acceptsAssignments : false,
      _operation_type: operationType,
    } as any);
    if (rpcError) throw rpcError;
    setOrgCreated(true);
    await refetch();
    return (data as string) ?? null;
  };

  const goNext = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]);
  };
  const goBack = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    goNext();
  };

  const handleOperationContinue = () => goNext();

  const handleResourcesContinue = async () => {
    setSubmitting(true);
    try {
      const orgId = await createOrgIfNeeded();
      if (!orgId) throw new Error("Couldn't set up organization");

      // Bulk-add engines (trucks)
      if (showsEngines(operationType) && engineNames.length > 0) {
        const trucks = engineNames.map((name) => ({
          name: name.trim(),
          organization_id: orgId,
        }));
        const { error } = await supabase.from("trucks").insert(trucks as any);
        if (error) throw error;
      }
      // Bulk-add crews
      if (showsHandCrews(operationType) && crewNames.length > 0) {
        await createCrewsBulk(orgId, crewNames);
      }
      goNext();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Couldn't save resources.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMembersContinue = async () => {
    setSubmitting(true);
    try {
      const orgId = await createOrgIfNeeded();
      if (!orgId) throw new Error("Couldn't set up organization");
      if (memberNames.length > 0) {
        const rows = memberNames.map((name) => ({
          name: name.trim(),
          organization_id: orgId,
          role: "crew", // placeholder — surfaced in Finish Setup card as incomplete
        }));
        const { error } = await supabase.from("crew_members").insert(rows as any);
        if (error) throw error;
      }
      goNext();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Couldn't save members.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await createOrgIfNeeded();
      toast({ title: "You're all set" });
      await refetch();
      // Navigate effect at top will redirect to "/"
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const headerSubtitle = pendingInvite
    ? `You've been invited to join ${pendingInvite.orgName ?? "a team"}.`
    : step === "type"
    ? "Choose the type that best matches your team."
    : step === "details"
    ? "Name your organization."
    : step === "operation"
    ? "What type of operation do you run?"
    : step === "resources"
    ? "Let's quickly set up your operation."
    : step === "members"
    ? "Add your crew members (optional)."
    : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Flame className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Set Up Your Team</h1>
          {headerSubtitle && <p className="text-sm text-muted-foreground text-center">{headerSubtitle}</p>}
        </div>

        {pendingInvite ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-card p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{pendingInvite.orgName ?? "Organization"}</p>
                <p className="text-xs text-muted-foreground capitalize">Role: {pendingInvite.role.replace("_", " ")}</p>
              </div>
            </div>
            <Button onClick={handleAcceptInvite} className="w-full touch-target" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Join Organization
            </Button>
          </div>
        ) : step === "type" ? (
          <div className="space-y-3">
            {ORG_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = orgType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setOrgType(opt.value)}
                  className={`flex w-full items-start gap-3 rounded-xl p-4 border text-left transition-all touch-target ${
                    selected ? "bg-primary/10 border-primary/50" : "bg-card border-border/40 active:scale-[0.99]"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    selected ? "bg-primary/20" : "bg-accent"
                  }`}>
                    <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-accent-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${selected ? "font-bold" : "font-semibold"}`}>{opt.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                  {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
                </button>
              );
            })}
            <Button onClick={goNext} className="w-full touch-target">
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </div>
        ) : step === "details" ? (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">
                {orgType === "contractor" ? "Company Name" : orgType === "vfd" ? "Department Name" : "Agency Name"}
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={orgType === "contractor" ? "e.g. Mountain Fire Services" : orgType === "vfd" ? "e.g. Pinecrest VFD" : "e.g. Cascade County Wildland"}
                  required
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {orgType === "vfd" && (
              <div className="rounded-xl bg-card p-4 flex items-start justify-between gap-3 border border-border/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Accepts assignment work</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Turn on if your department deploys on resource orders. Enables Resource Orders, Shift Tickets, Payroll.
                  </p>
                </div>
                <Switch checked={acceptsAssignments} onCheckedChange={setAcceptsAssignments} />
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goBack} className="touch-target">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1 touch-target" disabled={!companyName.trim()}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </div>
          </form>
        ) : step === "operation" ? (
          <div className="space-y-4">
            <OperationTypeStep value={operationType} onChange={setOperationType} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goBack} className="touch-target">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleOperationContinue} className="flex-1 touch-target">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </div>
          </div>
        ) : step === "resources" ? (
          <div className="space-y-4">
            <QuickResourcesStep
              operationType={operationType}
              engineNames={engineNames}
              onEngineNamesChange={setEngineNames}
              crewNames={crewNames}
              onCrewNamesChange={setCrewNames}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goBack} className="touch-target" disabled={submitting}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button variant="ghost" onClick={() => { setEngineNames([]); setCrewNames([]); handleResourcesContinue(); }} className="touch-target" disabled={submitting}>
                Skip
              </Button>
              <Button onClick={handleResourcesContinue} className="flex-1 touch-target" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Continue
              </Button>
            </div>
          </div>
        ) : step === "members" ? (
          <div className="space-y-4">
            <QuickCrewMembersStep memberNames={memberNames} onMemberNamesChange={setMemberNames} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goBack} className="touch-target" disabled={submitting}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button variant="ghost" onClick={() => { setMemberNames([]); handleMembersContinue(); }} className="touch-target" disabled={submitting}>
                Skip
              </Button>
              <Button onClick={handleMembersContinue} className="flex-1 touch-target" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ReadyStep
              engineCount={showsEngines(operationType) ? engineNames.length : 0}
              crewCount={showsHandCrews(operationType) ? crewNames.length : 0}
              memberCount={memberNames.length}
            />
            <Button onClick={handleFinish} className="w-full touch-target" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Go to Dashboard
            </Button>
          </div>
        )}

        {!pendingInvite && (
          <p className="text-xs text-center text-muted-foreground">
            If you've been invited to a team, we'll add you automatically.
          </p>
        )}
      </div>
    </div>
  );
}
