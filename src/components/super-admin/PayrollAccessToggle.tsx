import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

/** Global super-admin payroll kill-switch (platform_settings.payroll_global_enabled). */
export function GlobalPayrollToggle() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings", "payroll_global_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "payroll_global_enabled")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as any) ?? { enabled: true };
    },
  });

  useEffect(() => {
    if (data) setEnabled(data.enabled !== false);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { key: "payroll_global_enabled", value: { enabled: next } },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-settings", "payroll_global_enabled"] });
      qc.invalidateQueries({ queryKey: ["org-mode"] });
      toast.success("Payroll system updated");
    },
    onError: (err) => {
      toast.error("Failed to update", {
        description: err instanceof Error ? err.message : undefined,
      });
      setEnabled((v) => !v);
    },
  });

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    mutation.mutate(next);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Payroll System</CardTitle>
              <CardDescription className="mt-1">
                Master switch for the payroll module across all organizations.
                Per-org access still requires opt-in below.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || mutation.isPending}
          />
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {isLoading ? (
          <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</span>
        ) : enabled ? (
          "Payroll is available to opted-in organizations."
        ) : (
          "Payroll is disabled platform-wide. No organization can see it."
        )}
      </CardContent>
    </Card>
  );
}

/** Per-org payroll opt-in (organizations.modules_enabled.payroll). */
export function OrgPayrollToggle({ orgId, currentValue }: { orgId: string; currentValue: boolean }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(currentValue);

  useEffect(() => {
    setEnabled(currentValue);
  }, [currentValue]);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      // Use jsonb_set via RPC-equivalent: read-modify-write
      const { data: org, error: readErr } = await supabase
        .from("organizations")
        .select("modules_enabled")
        .eq("id", orgId)
        .single();
      if (readErr) throw readErr;
      const merged = { ...((org?.modules_enabled as any) ?? {}), payroll: next };
      const { error } = await supabase
        .from("organizations")
        .update({ modules_enabled: merged })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin", "org", orgId] });
      qc.invalidateQueries({ queryKey: ["org-mode"] });
      toast.success("Organization payroll setting updated");
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
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Payroll module</CardTitle>
              <CardDescription className="mt-1">
                Enable payroll for this organization. Org admins will see the Payroll tab.
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
    </Card>
  );
}
