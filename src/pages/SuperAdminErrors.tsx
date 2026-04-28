import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bug, WifiOff, Loader2, ChevronLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorRow {
  id: string;
  occurred_at: string;
  route: string | null;
  message: string;
  stack: string | null;
  app_version: string | null;
  online: boolean | null;
  user_agent: string | null;
  user_id: string | null;
  organization_id: string | null;
}

export default function SuperAdminErrors() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin-error-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ErrorRow[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/super-admin"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Errors</h1>
            <p className="text-sm text-muted-foreground">Crash reports across all orgs (last 200)</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load error logs: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No errors logged. Nice.
          </div>
        )}

        {!isLoading && data && data.length > 0 && (
          <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
            {data.map((row) => (
              <details key={row.id} className="group">
                <summary className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30">
                  <Bug className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">{row.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(row.occurred_at).toLocaleString()}
                      {row.route ? ` · ${row.route}` : ""}
                      {row.app_version ? ` · v${row.app_version}` : ""}
                      {row.organization_id ? ` · org ${row.organization_id.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  {row.online === false && (
                    <span title="Offline when error occurred">
                      <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                    </span>
                  )}
                </summary>
                {(row.stack || row.user_agent) && (
                  <div className="px-4 pb-4 pl-11 space-y-2">
                    {row.stack && (
                      <pre className="text-[11px] bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-64">
                        {row.stack}
                      </pre>
                    )}
                    {row.user_agent && (
                      <p className="text-[11px] text-muted-foreground break-all">{row.user_agent}</p>
                    )}
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
