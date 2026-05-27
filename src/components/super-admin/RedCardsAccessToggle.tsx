import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/** Per-org Red Cards opt-in (organizations.modules_enabled.redCards). */
export function OrgRedCardsToggle({ orgId, currentValue }: { orgId: string; currentValue: boolean }) {
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
      const merged = { ...((org?.modules_enabled as any) ?? {}), redCards: next };
      const { error } = await supabase
        .from("organizations")
        .update({ modules_enabled: merged })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin", "org", orgId] });
      qc.invalidateQueries({ queryKey: ["org-mode"] });
      toast.success("Red Cards setting updated");
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
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Red Cards module</CardTitle>
              <CardDescription className="mt-1">
                Enable Incident Qualification Cards (Red Cards) for this organization.
                Admins can add or scan cards; crew members can view their own.
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
        {enabled ? "Red Cards are visible to this organization." : "Red Cards are hidden for this organization."}
      </CardContent>
    </Card>
  );
}
