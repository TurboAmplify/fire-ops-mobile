import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flame, Building2, ArrowRight, Users, Briefcase, Shield, Landmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Navigate } from "react-router-dom";
import type { OrgType } from "@/lib/app-mode";

const ORG_TYPE_OPTIONS: Array<{
  value: OrgType;
  title: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    value: "contractor",
    title: "Contractor",
    desc: "Wildland fire contracting business with billable trucks and crews.",
    icon: Briefcase,
  },
  {
    value: "vfd",
    title: "Volunteer Fire Department",
    desc: "Local response, structure, EMS — with optional resource-order assignments.",
    icon: Shield,
  },
  {
    value: "state_agency",
    title: "State or Local Agency",
    desc: "Government or agency crew using internal time reporting.",
    icon: Landmark,
  },
];

type Step = "type" | "details";

export default function OrgSetup() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: orgLoading, refetch } = useOrganization();
  const { isPlatformAdmin, loading: paLoading } = usePlatformAdmin();
  const { isImpersonating } = useImpersonation();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("contractor");
  const [acceptsAssignments, setAcceptsAssignments] = useState(false);
  const [step, setStep] = useState<Step>("type");
  const [submitting, setSubmitting] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<{
    id: string;
    organization_id: string;
    role: string;
    orgName?: string;
  } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingInvite(false);
      return;
    }
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
      } catch {
        // ignore
      } finally {
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
  if (membership) return <Navigate to="/" replace />;
  // Platform admins without an org membership belong on the super-admin
  // dashboard, not the team-setup flow (unless actively impersonating).
  if (isPlatformAdmin && !isImpersonating) return <Navigate to="/super-admin" replace />;

  const handleAcceptInvite = async () => {
    if (!pendingInvite || !user) return;
    setSubmitting(true);
    try {
      await supabase.from("organization_members").insert({
        organization_id: pendingInvite.organization_id,
        user_id: user.id,
        role: pendingInvite.role,
      });
      await supabase
        .from("organization_invites")
        .update({ status: "accepted" })
        .eq("id", pendingInvite.id);
      toast({ title: "Joined organization", description: "You've been added to your team." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc("create_organization_with_owner" as any, {
        _name: companyName.trim(),
        _org_type: orgType,
        _accepts_assignments: orgType === "vfd" ? acceptsAssignments : false,
      } as any);
      if (rpcError) throw rpcError;

      toast({ title: "Organization created", description: `${companyName.trim()} is ready.` });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Flame className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Set Up Your Team</h1>
          <p className="text-sm text-muted-foreground text-center">
            {pendingInvite
              ? `You've been invited to join ${pendingInvite.orgName ?? "a team"}.`
              : step === "type"
              ? "Choose the type that best matches your team."
              : "Name your organization."}
          </p>
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
                    selected
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card border-border/40 active:scale-[0.99]"
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
            <Button
              onClick={() => setStep("details")}
              className="w-full touch-target"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
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
                  placeholder={
                    orgType === "contractor"
                      ? "e.g. Mountain Fire Services"
                      : orgType === "vfd"
                      ? "e.g. Pinecrest VFD"
                      : "e.g. Cascade County Wildland"
                  }
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
                    Turn on if your department deploys on resource orders to federal/state incidents and bills for it.
                    This enables Resource Orders, Shift Tickets, and Payroll. You can change this later.
                  </p>
                </div>
                <Switch checked={acceptsAssignments} onCheckedChange={setAcceptsAssignments} />
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("type")} className="touch-target">
                Back
              </Button>
              <Button type="submit" className="flex-1 touch-target" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Create Organization
              </Button>
            </div>
          </form>
        )}

        <p className="text-xs text-center text-muted-foreground">
          If you've been invited to a team, we'll add you automatically.
        </p>
      </div>
    </div>
  );
}
