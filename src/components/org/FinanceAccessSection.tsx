import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Member {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}

/**
 * Org-admin control over who may see and change incident factoring/payment
 * status ("owner finance" access). Backed by `org_finance_access`, which the
 * `is_org_finance()` database function reads for all server-side checks.
 */
export function FinanceAccessSection({ orgId }: { orgId: string | undefined }) {
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["org-members-identity", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_org_members_with_identity", { _org_id: orgId! });
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
  });

  const { data: granted = new Set<string>() } = useQuery({
    queryKey: ["org-finance-access", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_finance_access" as any)
        .select("user_id")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return new Set(((data ?? []) as any[]).map((r) => r.user_id as string));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ userId, on }: { userId: string; on: boolean }) => {
      if (on) {
        const { data: me } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("org_finance_access" as any)
          .insert({ organization_id: orgId, user_id: userId, granted_by_user_id: me.user?.id ?? null } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("org_finance_access" as any)
          .delete()
          .eq("organization_id", orgId!)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-finance-access", orgId] });
      qc.invalidateQueries({ queryKey: ["finance-access", orgId] });
      toast.success("Finance access updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update finance access"),
  });

  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Landmark className="h-3.5 w-3.5" />
          Finance Access
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Only these people can see or change incident factoring / payment status.
        </p>
      </div>

      <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No members yet</div>
        ) : (
          members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.full_name?.trim() || m.email || "Unknown user"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <Switch
                checked={granted.has(m.user_id)}
                disabled={toggle.isPending}
                onCheckedChange={(on) => toggle.mutate({ userId: m.user_id, on })}
                aria-label={`Finance access for ${m.full_name ?? m.email ?? "member"}`}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
