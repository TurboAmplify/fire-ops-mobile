import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, Truck as TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Admin-only screen to set the daily earning rate for each truck.
 * Used by the P&L report to calculate revenue (truck-days × day_rate).
 * Only reachable when payroll module is enabled for the org.
 */
export default function FleetTruckRates() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [rates, setRates] = useState<Record<string, string>>({});

  const { data: trucks, isLoading } = useQuery({
    queryKey: ["truck-rates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucks")
        .select("id, name, unit_type, day_rate")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Seed local edits when data loads
  useEffect(() => {
    if (trucks) {
      const seeded: Record<string, string> = {};
      trucks.forEach((t: any) => {
        seeded[t.id] = String(t.day_rate ?? 0);
      });
      setRates(seeded);
    }
  }, [trucks]);

  const saveMutation = useMutation({
    mutationFn: async ({ truckId, rate }: { truckId: string; rate: number }) => {
      const { error } = await supabase
        .from("trucks")
        .update({ day_rate: rate } as any)
        .eq("id", truckId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["truck-rates", orgId] });
      qc.invalidateQueries({ queryKey: ["trucks"] });
      toast.success("Rate saved");
    },
    onError: (err) => {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : undefined });
    },
  });

  const saveOne = (truckId: string) => {
    const raw = rates[truckId] ?? "0";
    const rate = Number(raw);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    saveMutation.mutate({ truckId, rate });
  };

  return (
    <AppShell title="Truck Rates" showBack onBack={() => navigate("/fleet")}>
      <div className="p-4 space-y-3">
        <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
          <DollarSign className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>
            Daily rate each truck earns when assigned to an incident. Used by the P&amp;L
            report to calculate revenue (truck-days × rate).
          </span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!trucks || trucks.length === 0) && (
          <div className="py-16 text-center">
            <TruckIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No trucks yet</p>
          </div>
        )}

        {!isLoading && trucks && trucks.length > 0 && (
          <div className="space-y-2">
            {trucks.map((t: any) => {
              const orig = String(t.day_rate ?? 0);
              const current = rates[t.id] ?? "";
              const dirty = current !== orig;
              return (
                <div
                  key={t.id}
                  className="rounded-xl bg-card card-shadow p-3 flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <TruckIcon className="h-4 w-4 text-accent-foreground/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    {t.unit_type && (
                      <p className="text-[11px] text-muted-foreground truncate">{t.unit_type}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="50"
                        value={current}
                        onChange={(e) =>
                          setRates((prev) => ({ ...prev, [t.id]: e.target.value }))
                        }
                        className="h-9 w-28 pl-5 text-right"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveOne(t.id)}
                      disabled={!dirty || saveMutation.isPending}
                      className="h-9"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
