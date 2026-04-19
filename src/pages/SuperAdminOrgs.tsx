import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Building2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type OrgRow = {
  id: string;
  name: string;
  org_type: string;
  tier: string;
  seat_limit: number;
  created_at: string;
  member_count: number;
  pending_invite_count: number;
  incident_count: number;
  last_activity_at: string | null;
};

export default function SuperAdminOrgs() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_organizations");
      if (error) throw error;
      return (data ?? []) as OrgRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/super-admin" aria-label="Back to super admin">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Organizations</h1>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.length} total` : "Loading..."}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by org name or ID"
            className="pl-9"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">
              Failed to load organizations: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {search ? "No orgs match your search." : "No organizations yet."}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {filtered.map((o) => (
            <Link
              key={o.id}
              to={`/super-admin/organizations/${o.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{o.name}</p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {o.tier}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {o.org_type}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {o.member_count} / {o.seat_limit} seats
                      {o.pending_invite_count > 0 && (
                        <> · {o.pending_invite_count} pending invite{o.pending_invite_count === 1 ? "" : "s"}</>
                      )}
                      {" · "}
                      {o.incident_count} incident{o.incident_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    {o.last_activity_at ? (
                      <>Active {formatDistanceToNow(new Date(o.last_activity_at), { addSuffix: true })}</>
                    ) : (
                      "No activity"
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
