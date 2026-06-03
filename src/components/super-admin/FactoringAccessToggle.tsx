import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";
import { toast } from "sonner";

/**
 * Per-org factoring opt-in (organizations.modules_enabled.factoring).
 * Lets the org's admins access the WideQ Schedule-of-Accounts workflow.
 */
export function OrgFactoringToggle({ orgId, currentValue }: { orgId: string; currentValue: boolean }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(currentValue);

  useEffect(() => {
    setEnabled(currentValue);
  }, [currentValue]);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { data: org, error: readErr } = await supabase
        .from("organizations")
        .select("modules_enabled")
        .eq("id", orgId)
        .single();
      if (readErr) throw readErr;
      const merged = { ...((org?.modules_enabled as any) ?? {}), factoring: next };
      const { error } = await supabase
        .from("organizations")
        .update({ modules_enabled: merged })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin", "org", orgId] });
      qc.invalidateQueries({ queryKey: ["org-mode"] });
      qc.invalidateQueries({ queryKey: ["org-modules", orgId] });
      toast.success("Factoring access updated");
    },
    onError: (err) => {
      toast.error("Failed to update", {
        description: err instanceof Error ? err.message : undefined,
      });
      setEnabled((v) => !v);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Invoice Factoring</CardTitle>
              <CardDescription className="mt-1">
                Enable the Schedule of Accounts workflow for this org. Admins can configure
                the factoring contact, generate schedules from signed OF-286s, and submit
                packages to the factor.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              setEnabled(v);
              mutation.mutate(v);
            }}
            disabled={mutation.isPending}
          />
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {enabled
          ? "Enabled — owner/admins see the Factoring section under Organization Settings and on incident overviews."
          : "Disabled — no factoring features are visible to this org."}
      </CardContent>
    </Card>
  );
}
