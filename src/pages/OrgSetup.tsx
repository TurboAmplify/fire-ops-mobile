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

const normalizeInviteRole = (role: string | null | undefined) => {
  if (role === "crew" || role === "member") return "crew_member";
  if (role === "crew_boss") return "engine_boss";
  if (role === "owner") return "admin";
  return role ?? "crew_member";
};

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
  const { isImpersonating, loading: impersonationLoading } = useImpersonation();
  const { toast } = useToast();

  const [pendingInvite, setPendingInvite] = useState<{
    id: string;
    organization_id: string;
    role: string;
    invite_code?: string | null;
    orgName?: string;
    invitee_name?: string | null;
  } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Only fetch invites if the user is signed in AND we've confirmed they
  // have no membership. Otherwise this query was firing on every render
  // even for users who already had orgs — contributing to the loading loop.
  useEffect(() => {
    if (authLoading || orgLoading || paLoading || impersonationLoading) return;
    if (!user) {
      setCheckingInvite(false);
      return;
    }
    if (membership) {
      // We're about to redirect to "/" — don't bother fetching invites.
      setCheckingInvite(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const metadataCode = String((user.user_metadata as any)?.invite_code ?? "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        if (metadataCode.length >= 6) {
          const { error } = await supabase.rpc("accept_invite_by_code" as any, { _code: metadataCode } as any);
          if (!error) {
            if (!cancelled) {
              toast({ title: "Joined organization", description: "You've been added to your team." });
              await refetch();
            }
            return;
          }
        }

        const { data: invite } = await supabase
          .from("organization_invites")
          .select("id, organization_id, role, invite_code, invitee_name, organizations(name)")
          .eq("email", user.email ?? "")
          .in("status", ["pending", "accepted"])
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (invite) {
          const code = String((invite as any).invite_code ?? "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          if (code.length >= 6) {
            const { error } = await supabase.rpc("accept_invite_by_code" as any, { _code: code } as any);
            if (!error) {
              if (!cancelled) {
                toast({ title: "Joined organization", description: "You've been added to your team." });
                await refetch();
              }
              return;
            }
          }

          setPendingInvite({
            id: invite.id,
            organization_id: invite.organization_id,
            role: invite.role,
            invite_code: (invite as any).invite_code ?? null,
            invitee_name: (invite as any).invitee_name ?? null,
            orgName: (invite as any).organizations?.name,
          });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCheckingInvite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, membership, authLoading, orgLoading, paLoading, impersonationLoading, refetch, toast]);

  if (authLoading || orgLoading || paLoading || impersonationLoading || checkingInvite) {
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
      const { error } = await supabase.rpc("accept_invite_by_code" as any, {
        _code: pendingInvite.invite_code ?? (user.user_metadata as any)?.invite_code ?? "",
      } as any);

      // If this is an older email-matched invite with no metadata code, fall
      // back to the same normalized membership insert used by the RPC.
      if (error) {
        const { error: memberError } = await supabase.from("organization_members").insert({
          organization_id: pendingInvite.organization_id,
          user_id: user.id,
          role: normalizeInviteRole(pendingInvite.role),
        });
        if (memberError) throw memberError;
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
