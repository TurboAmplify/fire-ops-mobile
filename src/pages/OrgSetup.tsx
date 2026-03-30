import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flame, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigate } from "react-router-dom";

export default function OrgSetup() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: orgLoading, refetch } = useOrganization();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Already has an org — go to dashboard
  if (membership) {
    return <Navigate to="/" replace />;
  }

  const [pendingInvite, setPendingInvite] = useState<{
    id: string;
    organization_id: string;
    role: string;
    organizations?: { name: string } | null;
  } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  // Check for pending invites on mount
  useState(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: invite } = await supabase
          .from("organization_invites")
          .select("id, organization_id, role, organizations(name)")
          .eq("email", user.email ?? "")
          .eq("status", "pending")
          .maybeSingle();
        setPendingInvite(invite as any);
      } catch {
        // ignore
      } finally {
        setCheckingInvite(false);
      }
    })();
  });

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
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: companyName.trim() })
        .select("id")
        .single();

      if (orgError) throw orgError;

      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      toast({ title: "Organization created", description: `${companyName.trim()} is ready.` });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Flame className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Set Up Your Team</h1>
          <p className="text-sm text-muted-foreground text-center">
            Create your company to start managing incidents, crews, and expenses.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Mountain Fire Services"
                required
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <Button type="submit" className="w-full touch-target" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Create Organization
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          If you've been invited to a team, we'll add you automatically.
        </p>
      </div>
    </div>
  );
}
