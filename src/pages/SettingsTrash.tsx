import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useTrashedIncidents,
  useRestoreIncident,
  useHardDeleteIncident,
} from "@/hooks/useIncidents";
import {
  fetchTrashedIncidentTrucks,
  restoreIncidentTruck,
  hardDeleteIncidentTruck,
} from "@/services/incident-trucks";
import { useOrganization } from "@/hooks/useOrganization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function daysRemaining(deletedAt: string): number {
  const ms = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, 30 - Math.floor(ms / 86400000));
}

export default function SettingsTrash() {
  const navigate = useNavigate();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  const qc = useQueryClient();

  const { data: incidents, isLoading: incLoading } = useTrashedIncidents();
  const restoreInc = useRestoreIncident();
  const hardDelInc = useHardDeleteIncident();

  const { data: trucks, isLoading: trkLoading } = useQuery({
    queryKey: ["incident-trucks", "trash", orgId],
    queryFn: () => fetchTrashedIncidentTrucks(orgId),
    enabled: !!orgId,
    staleTime: 1000 * 30,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmHardId, setConfirmHardId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const refreshTrucks = () =>
    qc.invalidateQueries({ queryKey: ["incident-trucks", "trash", orgId] });

  const handleRestoreTruck = async (id: string, name: string) => {
    setBusyId(id);
    try {
      await restoreIncidentTruck(id);
      toast.success(`Restored ${name}`);
      refreshTrucks();
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore");
    } finally {
      setBusyId(null);
    }
  };

  const handleHardDeleteTruck = async (id: string, name: string) => {
    setBusyId(id);
    try {
      await hardDeleteIncidentTruck(id);
      toast.success(`Permanently deleted ${name}`);
      setConfirmHardId(null);
      setTyped("");
      refreshTrucks();
    } catch (e: any) {
      toast.error(e?.message || "Permanent delete failed (related records may still exist)");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell
      title="Trash"
      headerRight={
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Soft-deleted items. Restore within 30 days, or permanently delete them here.
        </p>

        <Tabs defaultValue="incidents">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incidents">Incidents ({incidents?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="trucks">Truck assignments ({trucks?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-2 mt-3">
            {incLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-muted-foreground" />}
            {!incLoading && (!incidents || incidents.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">Nothing in the trash.</p>
            )}
            {incidents?.map((inc) => {
              const days = daysRemaining(inc.deleted_at!);
              const isConfirming = confirmHardId === `inc:${inc.id}`;
              return (
                <div key={inc.id} className="rounded-xl bg-card p-3 card-shadow space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{inc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Deleted {new Date(inc.deleted_at!).toLocaleString()} · {days} day{days === 1 ? "" : "s"} left
                      </p>
                      {inc.deleted_reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">"{inc.deleted_reason}"</p>
                      )}
                    </div>
                  </div>
                  {!isConfirming ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={restoreInc.isPending}
                        onClick={async () => {
                          try {
                            await restoreInc.mutateAsync(inc.id);
                            toast.success(`Restored "${inc.name}"`);
                          } catch (e: any) {
                            toast.error(e?.message || "Restore failed");
                          }
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setConfirmHardId(`inc:${inc.id}`); setTyped(""); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Permanently delete
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                      <p className="text-xs text-destructive font-medium">
                        Type the incident name to confirm permanent deletion. This cannot be undone.
                      </p>
                      <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder={inc.name}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={typed.trim() !== inc.name || hardDelInc.isPending}
                          onClick={async () => {
                            try {
                              await hardDelInc.mutateAsync(inc.id);
                              toast.success(`Permanently deleted "${inc.name}"`);
                              setConfirmHardId(null);
                              setTyped("");
                            } catch (e: any) {
                              toast.error(e?.message || "Permanent delete failed (related records may still exist)");
                            }
                          }}
                        >
                          {hardDelInc.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                          Delete forever
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setConfirmHardId(null); setTyped(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="trucks" className="space-y-2 mt-3">
            {trkLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-muted-foreground" />}
            {!trkLoading && (!trucks || trucks.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">Nothing in the trash.</p>
            )}
            {trucks?.map((it) => {
              const days = daysRemaining(it.deleted_at!);
              const isConfirming = confirmHardId === `trk:${it.id}`;
              const label = `${it.trucks.name}${it.incidents?.name ? ` on ${it.incidents.name}` : ""}`;
              return (
                <div key={it.id} className="rounded-xl bg-card p-3 card-shadow space-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      Removed {new Date(it.deleted_at!).toLocaleString()} · {days} day{days === 1 ? "" : "s"} left
                    </p>
                    {it.deleted_reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{it.deleted_reason}"</p>
                    )}
                  </div>
                  {!isConfirming ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === it.id}
                        onClick={() => handleRestoreTruck(it.id, it.trucks.name)}
                      >
                        {busyId === it.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        )}
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setConfirmHardId(`trk:${it.id}`); setTyped(""); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Permanently delete
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                      <p className="text-xs text-destructive font-medium">
                        Type the truck name (<strong>{it.trucks.name}</strong>) to confirm. This will also cascade-delete all shift tickets attached to this assignment.
                      </p>
                      <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder={it.trucks.name}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={typed.trim() !== it.trucks.name || busyId === it.id}
                          onClick={() => handleHardDeleteTruck(it.id, label)}
                        >
                          {busyId === it.id && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                          Delete forever
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setConfirmHardId(null); setTyped(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
