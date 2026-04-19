import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Activity, UserPlus, Building2, Users, Flame, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const ICONS: Record<string, typeof Activity> = {
  signup: UserPlus,
  org_created: Building2,
  member_joined: Users,
  incident_created: Flame,
  shift_ticket_submitted: FileText,
};

const LABELS: Record<string, string> = {
  signup: "Signup",
  org_created: "Org created",
  member_joined: "Member joined",
  incident_created: "Incident",
  shift_ticket_submitted: "Shift ticket",
};

export default function SuperAdminActivity() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_recent_activity", { _days: 7 });
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
            <h1 className="text-lg font-semibold leading-tight">Activity feed</h1>
            <p className="text-xs text-muted-foreground">Last 7 days across all orgs</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load activity"}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No activity in the last 7 days.
          </div>
        )}

        {data && data.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {data.map((row, idx) => {
                  const Icon = ICONS[row.event_type] ?? Activity;
                  const when = row.occurred_at ? formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true }) : "";
                  return (
                    <li key={idx} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{row.title}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {LABELS[row.event_type] ?? row.event_type}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.subtitle}
                          {row.actor_email ? ` · ${row.actor_email}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">{when}</div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
