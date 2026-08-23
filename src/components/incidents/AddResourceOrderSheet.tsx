import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Sparkles, Truck as TruckIcon, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAvailableTrucks, useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { assignTruckToIncident, startNewTruckPart } from "@/services/incident-trucks";
import {
  uploadResourceOrderFile,
  parseResourceOrderAI,
  createResourceOrder,
  updateResourceOrderParsed,
  findIncidentTruckForResourceOrder,
} from "@/services/resource-orders";
import { fuzzyMatchName } from "@/lib/fuzzy-name";
import { assertOnlineForWrite } from "@/lib/offline-guard";

interface Props {
  incidentId: string;
  incidentName?: string;
  organizationId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the incident_truck id the RO landed on, so the caller can expand it. */
  onAttached?: (incidentTruckId: string) => void;
}

type Target = { kind: "existing"; incidentTruckId: string } | { kind: "new-part" } | { kind: "assign" };

/**
 * Upload a Resource Order directly onto an existing incident.
 * The RO is parsed, a truck is suggested, and after explicit confirmation the
 * truck is assigned (or a new Part is started) and the RO is attached to it.
 * This keeps crew swaps / second trucks on ONE incident instead of creating a
 * duplicate incident.
 */
export function AddResourceOrderSheet({
  incidentId,
  incidentName,
  organizationId,
  open,
  onOpenChange,
  onAttached,
}: Props) {
  const qc = useQueryClient();
  const { data: orgTrucks } = useAvailableTrucks(organizationId ?? undefined);
  const { data: incidentTrucks } = useIncidentTrucks(incidentId);

  const [busy, setBusy] = useState<null | "uploading" | "parsing" | "saving">(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsed, setParsed] = useState<Record<string, any> | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const reset = () => {
    setBusy(null);
    setFileUrl(null);
    setFileName("");
    setParsed(null);
    setSelectedTruckId(null);
    setTarget(null);
    setDupWarning(null);
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 250);
  };

  /** Existing (non-deleted) assignments of the selected truck on this incident. */
  const existingParts = useMemo(() => {
    if (!selectedTruckId) return [];
    return (incidentTrucks ?? [])
      .filter((it) => it.truck_id === selectedTruckId)
      .sort((a, b) => ((a as any).part_number ?? 1) - ((b as any).part_number ?? 1));
  }, [incidentTrucks, selectedTruckId]);

  const suggestTruck = (data: Record<string, any>): string | null => {
    if (!orgTrucks?.length) return null;
    const candidates = [data.resource_name, data.resource_order_number]
      .filter(Boolean)
      .map(String);
    const names = orgTrucks.map((t) => t.name);
    for (const c of candidates) {
      const m = fuzzyMatchName(c, names, 0.7);
      if (m) {
        const hit = orgTrucks.find((t) => t.name === m.match);
        if (hit) return hit.id;
      }
    }
    if (data.resource_type) {
      const wanted = String(data.resource_type).toLowerCase();
      const sameType = orgTrucks.filter(
        (t) =>
          (t.unit_type ?? "").toLowerCase().includes(wanted) ||
          wanted.includes((t.unit_type ?? "").toLowerCase()),
      );
      if (sameType.length === 1) return sameType[0].id;
    }
    return null;
  };

  const pickTruck = (truckId: string) => {
    setSelectedTruckId(truckId);
    const parts = (incidentTrucks ?? []).filter((it) => it.truck_id === truckId);
    if (parts.length === 0) {
      setTarget({ kind: "assign" });
    } else {
      // Default to a new part — a second RO for the same truck is almost always
      // a crew swap / new order period that bills on its own OF-286.
      setTarget({ kind: "new-part" });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      assertOnlineForWrite();
    } catch (err: any) {
      toast.error(err?.message || "You're offline");
      return;
    }
    setBusy("uploading");
    try {
      const url = await uploadResourceOrderFile(file, organizationId ?? undefined);
      setFileUrl(url);
      setFileName(file.name);
      setBusy("parsing");
      let data: Record<string, any> = {};
      try {
        data = await parseResourceOrderAI(url, file.name);
      } catch {
        toast.error("AI couldn't read the order — pick the truck manually");
      }
      setParsed(data);

      const suggestion = suggestTruck(data);
      if (suggestion) pickTruck(suggestion);

      if (data.resource_order_number && organizationId) {
        const dup = await findIncidentTruckForResourceOrder(
          organizationId,
          String(data.resource_order_number),
        );
        setDupWarning(
          dup
            ? `RO #${dup.resource_order_number} is already attached to "${dup.incident_name}".`
            : null,
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = async () => {
    if (!fileUrl || !selectedTruckId || !target) return;
    setBusy("saving");
    try {
      assertOnlineForWrite();
      let incidentTruckId: string;
      if (target.kind === "existing") {
        incidentTruckId = target.incidentTruckId;
      } else if (target.kind === "new-part" && existingParts.length > 0) {
        const created = await startNewTruckPart(existingParts[existingParts.length - 1].id);
        incidentTruckId = created.id;
      } else {
        const assigned = await assignTruckToIncident(incidentId, selectedTruckId);
        incidentTruckId = assigned.id;
      }

      const order = await createResourceOrder({
        incident_truck_id: incidentTruckId,
        organization_id: organizationId ?? null,
        file_url: fileUrl,
        file_name: fileName,
      });
      if (parsed && Object.keys(parsed).length > 0) {
        await updateResourceOrderParsed(order.id, parsed);
      }

      qc.invalidateQueries({ queryKey: ["incident-trucks", incidentId] });
      qc.invalidateQueries({ queryKey: ["resource-orders", incidentTruckId] });
      qc.invalidateQueries({ queryKey: ["incident-resource-orders-rollup", incidentId] });

      toast.success("Resource order added to this incident");
      onAttached?.(incidentTruckId);
      close();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't attach the resource order");
      setBusy(null);
    }
  };

  const selectedTruck = orgTrucks?.find((t) => t.id === selectedTruckId);
  const canConfirm = !!fileUrl && !!selectedTruckId && !!target && busy === null;

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Add Resource Order</SheetTitle>
          <SheetDescription>
            Attach another RO to {incidentName || "this incident"} — no second incident needed.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-8">
          {!fileUrl && (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center touch-target">
              {busy ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {busy === "uploading" ? "Uploading..." : "Reading the order..."}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Upload resource order</span>
                  <span className="text-xs text-muted-foreground">PDF or photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={!!busy}
                onChange={handleFile}
              />
            </label>
          )}

          {!fileUrl && (
            <TakePhotoButton onFile={handleFile} disabled={!!busy} label="Take Photo of Resource Order" />
          )}


          {fileUrl && (
            <>
              <div className="rounded-xl bg-secondary/50 p-3 space-y-1">
                <p className="text-sm font-medium truncate">{fileName}</p>
                {parsed && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {parsed.incident_name && <span>Fire: {parsed.incident_name}</span>}
                    {parsed.resource_order_number && <span>RO# {parsed.resource_order_number}</span>}
                    {parsed.resource_name && <span>{parsed.resource_name}</span>}
                  </div>
                )}
              </div>

              {dupWarning && (
                <div className="flex gap-2 rounded-xl bg-amber-500/12 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{dupWarning} Double-check this isn't a duplicate.</span>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Which truck is this order for?
                </p>
                {(orgTrucks ?? []).map((truck) => {
                  const active = truck.id === selectedTruckId;
                  const already = (incidentTrucks ?? []).some((it) => it.truck_id === truck.id);
                  return (
                    <button
                      key={truck.id}
                      onClick={() => pickTruck(truck.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left touch-target ${
                        active ? "bg-primary/12 ring-1 ring-primary" : "bg-secondary"
                      }`}
                    >
                      <TruckIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{truck.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[truck.unit_type, already ? "already on this incident" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>

              {selectedTruckId && existingParts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {selectedTruck?.name} is already on this incident
                  </p>
                  <button
                    onClick={() => setTarget({ kind: "new-part" })}
                    className={`w-full rounded-lg p-3 text-left touch-target ${
                      target?.kind === "new-part" ? "bg-primary/12 ring-1 ring-primary" : "bg-secondary"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      Start Part {existingParts.length + 1} (new order period)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Crew swap or new RO — bills on its own OF-286.
                    </p>
                  </button>
                  {existingParts.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setTarget({ kind: "existing", incidentTruckId: it.id })}
                      className={`w-full rounded-lg p-3 text-left touch-target ${
                        target?.kind === "existing" && target.incidentTruckId === it.id
                          ? "bg-primary/12 ring-1 ring-primary"
                          : "bg-secondary"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        Add to Part {(it as any).part_number ?? 1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Same order period — corrected or extra paperwork.
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground touch-target disabled:opacity-50"
              >
                {busy === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {busy === "saving" ? "Attaching..." : "Add to this incident"}
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
