import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Upload, Loader2, X, Truck as TruckIcon, ChevronRight, FileText } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { useOrganization } from "@/hooks/useOrganization";
import { uploadShiftTicketImport } from "@/services/shift-ticket-import";
import { createShiftTicket } from "@/services/shift-tickets";
import { useQueryClient } from "@tanstack/react-query";
import { getLocalDateString } from "@/lib/local-date";

interface Props {
  open: boolean;
  onClose: () => void;
  incidentId: string;
  incidentName?: string;
  /** If a single truck is preselected, skip the picker entirely. */
  defaultIncidentTruckId?: string;
}

/**
 * One-tap paper-ticket attach. Mirrors the expense flow:
 *   1. Snap or pick a photo
 *   2. Pick truck (auto-skipped if only one)
 *   3. We upload, create a draft shift_ticket with the photo, and open it.
 *
 * No AI parsing required. The user can later open the ticket to add signatures
 * or fill fields if needed — but the record is already attached to the incident.
 */
export function QuickAttachPaperTicketSheet({
  open,
  onClose,
  incidentId,
  incidentName,
  defaultIncidentTruckId,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const { data: trucks } = useIncidentTrucks(incidentId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"pick-file" | "pick-truck" | "saving">("pick-file");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const reset = () => {
    setStage("pick-file");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleClose = () => {
    if (stage === "saving") return;
    reset();
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo too large (max 15MB).");
      return;
    }
    setPendingFile(file);
    // If we already know the truck, go straight to saving.
    if (defaultIncidentTruckId) {
      void doAttach(file, defaultIncidentTruckId);
    } else if (trucks && trucks.length === 1) {
      void doAttach(file, trucks[0].id);
    } else {
      setStage("pick-truck");
    }
  };

  const doAttach = async (file: File, incidentTruckId: string) => {
    if (!orgId) {
      toast.error("Organization not loaded");
      return;
    }
    setStage("saving");
    try {
      const photoUrl = await uploadShiftTicketImport(file, orgId);
      const truck = trucks?.find((t) => t.id === incidentTruckId);
      const ticket = await createShiftTicket({
        incident_truck_id: incidentTruckId,
        organization_id: orgId,
        status: "draft",
        incident_name: incidentName ?? null,
        equipment_make_model: truck?.trucks.unit_type ?? null,
        equipment_type: truck?.trucks.unit_type ?? null,
        // Seed an equipment row with today's date so the ticket sorts to "Today"
        equipment_entries: [
          {
            date: getLocalDateString(),
            start: "",
            stop: "",
            total: 0,
            quantity: "",
            type: "",
            remarks: "Paper ticket — see attached photo",
          },
        ] as any,
        personnel_entries: [] as any,
        paper_ticket_photo_url: photoUrl,
      } as any);
      toast.success("Paper ticket attached");
      qc.invalidateQueries({ queryKey: ["incident-tickets", incidentId] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
      reset();
      onClose();
      navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/${ticket.id}`);
    } catch (err) {
      console.error("Quick attach failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to attach ticket");
      setStage("pick-truck");
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && handleClose()}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Attach paper shift ticket
          </DrawerTitle>
          <button
            type="button"
            onClick={handleClose}
            disabled={stage === "saving"}
            className="touch-target rounded-lg p-1 text-muted-foreground active:bg-accent disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {stage === "pick-file" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Snap a photo of the signed paper ticket. We'll attach it to the incident
                so it counts toward accounting.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-5 text-center touch-target active:bg-accent/40">
                  <Camera className="h-7 w-7 text-primary" />
                  <span className="text-sm font-semibold">Take photo</span>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-5 text-center touch-target active:bg-accent/40">
                  <Upload className="h-7 w-7 text-primary" />
                  <span className="text-sm font-semibold">Choose file</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                After it's attached you can open the ticket to add signatures or extract
                fields with AI — optional.
              </p>
            </div>
          )}

          {stage === "pick-truck" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-1">Which truck is this for?</p>
              {trucks?.map((it) => (
                <button
                  key={it.id}
                  onClick={() => pendingFile && doAttach(pendingFile, it.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-4 text-left active:scale-[0.99] transition-transform touch-target"
                >
                  <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{it.trucks.name}</p>
                    {it.trucks.unit_type && (
                      <p className="text-[11px] text-muted-foreground">{it.trucks.unit_type}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </button>
              ))}
            </div>
          )}

          {stage === "saving" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Attaching ticket...</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
