import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft, Building2, Eye, UserPlus, UserMinus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type OrgDetail = {
  id: string;
  name: string;
  org_type: string;
  tier: string;
  seat_limit: number;
  accepts_assignments: boolean;
  modules_enabled: Record<string, unknown>;
  created_at: string;
  members: Array<{
    user_id: string;
    role: string;
    joined_at: string;
    email: string | null;
    full_name: string | null;
    last_sign_in_at: string | null;
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    expires_at: string;
  }>;
  counts: {
    incidents: number;
    active_incidents: number;
    trucks: number;
    crew_members: number;
    shift_tickets: number;
    expenses: number;
    expense_total: number;
  };
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminOrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { startViewAs } = useImpersonation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "org", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_organization", { _org_id: orgId! });
      if (error) throw error;
      return data as unknown as OrgDetail | null;
    },
  });

  const handleViewAs = async () => {
    if (!orgId) return;
    try {
      await startViewAs(orgId, data?.name);
      // Drop any cached data from prior context so org-scoped queries refetch
      queryClient.clear();
      toast.success(`Viewing as ${data?.name ?? "organization"} (read-only)`);
      navigate("/");
    } catch (err) {
      toast.error("Failed to start view-as", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/super-admin/organizations" aria-label="Back to organizations">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight">
              {data?.name ?? "Organization"}
            </h1>
            <p className="truncate font-mono text-xs text-muted-foreground">{orgId}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!data}
            onClick={handleViewAs}
          >
            <Eye className="h-4 w-4" />
            View as this org
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">
              Failed to load organization: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && !data && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Organization not found.
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Tier" value={data.tier} />
              <StatCard label="Seats" value={`${data.members.length} / ${data.seat_limit}`} />
              <StatCard label="Type" value={data.org_type} />
              <StatCard
                label="Created"
                value={format(new Date(data.created_at), "MMM d, yyyy")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Incidents" value={`${data.counts.active_incidents} / ${data.counts.incidents}`} />
              <StatCard label="Trucks" value={data.counts.trucks} />
              <StatCard label="Crew" value={data.counts.crew_members} />
              <StatCard label="Shift tickets" value={data.counts.shift_tickets} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Expenses" value={data.counts.expenses} />
              <StatCard
                label="Expense total"
                value={`$${Number(data.counts.expense_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members ({data.members.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members.</p>
                ) : (
                  data.members.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between gap-4 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.full_name || m.email || m.user_id}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
                          {m.role}
                        </span>
                        <p className="mt-1">
                          {m.last_sign_in_at
                            ? `Signed in ${formatDistanceToNow(new Date(m.last_sign_in_at), { addSuffix: true })}`
                            : "Never signed in"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending invites ({data.invites.filter((i) => i.status === "pending").length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invites.</p>
                ) : (
                  data.invites.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between gap-4 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited as {i.role} · {format(new Date(i.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
                          {i.status}
                        </span>
                        <p className="mt-1">
                          Expires {formatDistanceToNow(new Date(i.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
