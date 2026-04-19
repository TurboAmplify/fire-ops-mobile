import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type OrgMembership = {
  organization_id: string;
  organization_name: string;
  role: string;
  joined_at: string;
};

export default function SuperAdminUsers() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin-users", search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _search: search || null,
        _limit: 100,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/super-admin">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div className="ml-2">
            <h1 className="text-lg font-semibold leading-tight">Users</h1>
            <p className="text-xs text-muted-foreground">Search across all organizations</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(input.trim());
          }}
          className="mb-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by email or name…"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load users"}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        )}

        {data && data.length > 0 && (
          <div className="space-y-3">
            {data.map((u) => {
              const orgs = (u.organizations as unknown as OrgMembership[]) ?? [];
              const lastSeen = u.last_sign_in_at
                ? formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true })
                : "never";
              return (
                <Card key={u.user_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate font-medium">{u.full_name || u.email}</span>
                        </div>
                        {u.full_name && (
                          <div className="mt-0.5 truncate text-sm text-muted-foreground">{u.email}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <div>Last sign-in: {lastSeen}</div>
                        <div>{Number(u.org_count)} org{Number(u.org_count) === 1 ? "" : "s"}</div>
                      </div>
                    </div>

                    {orgs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {orgs.map((o) => (
                          <Link
                            key={o.organization_id}
                            to={`/super-admin/organizations/${o.organization_id}`}
                            className="group"
                          >
                            <Badge variant="outline" className="group-hover:border-primary/40">
                              {o.organization_name}
                              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {o.role}
                              </span>
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
