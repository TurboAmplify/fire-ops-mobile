import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flame, ArrowRight, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";

/**
 * OrgSetup is now invite-only inside the iOS app.
 *
 * New organizations are created exclusively from the FireOps HQ marketing
 * site (fireopshq.com). The app intentionally exposes no path for a user to
 * create a brand-new org — Apple guideline 3.1.1 / 3.1.3(b) compliance: no
 * external link to purchase, no in-app sign-up funnel.
 *
 * If a user lands here without a pending invite, we show a generic
 * "Account unavailable — contact your administrator" screen.
 */
export default function OrgSetup() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { membership, loading: orgLoading, refetch } = useOrganization();
  const { isPlatformAdmin, loading: paLoading } = usePlatformAdmin();
  const { isImpersonating } = useImpersonation();
  const { toast } = useToast();

  const [pendingInvite, setPendingInvite] = useState<{
    id: string;
    organization_id: string;
    role: string;
    orgName?: string;
    invitee_name?: string | null;
  } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setCheckingInvite(false);
      return;
    }
    (async () => {
      try {
        const { data: invite } = await supabase
          .from("organization_invites")
          .select("id, organization_id, role, invitee_name, organizations(name)")
          .eq("email", user.email ?? "")
          .eq("status", "pending")
          .maybeSingle();
        if (invite) {
          setPendingInvite({
            id: invite.id,
            organization_id: invite.organization_id,
            role: invite.role,
            invitee_name: (invite as any).invitee_name ?? null,
            orgName: (invite as any).organizations?.name,
          });
        }
      } catch {
        /* ignore */
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
  if (isPlatformAdmin && !isImpersonating && !membership) {
    return <Navigate to="/super-admin" replace />;
  }

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

      const inviteName = pendingInvite.invitee_name?.trim();
      if (inviteName) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (!prof?.full_name || prof.full_name.trim().length === 0) {
          await supabase.from("profiles").update({ full_name: inviteName }).eq("id", user.id);
        }
      }

      toast({ title: "Joined organization", description: "You've been added to your team." });
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
          <h1 className="text-2xl font-extrabold tracking-tight">FireOps HQ</h1>
        </div>

        {pendingInvite ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You've been invited to join {pendingInvite.orgName ?? "a team"}.
            </p>
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
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your account isn't linked to an organization yet. Please contact your team
              administrator to receive an invite.
            </p>
            <Button variant="outline" onClick={() => signOut()} className="w-full touch-target">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
