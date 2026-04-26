import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Loader2, Pencil, Trash2, Copy, Download, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useShiftTickets, useDeleteShiftTicket, useDuplicateShiftTicket } from "@/hooks/useShiftTickets";
import { generateOF297PdfBlob, buildOF297FileName } from "@/components/shift-tickets/generateOF297Pdf";
import type { ShiftTicket } from "@/services/shift-tickets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function StatusBadge({ ticket }: { ticket: any }) {
  const hasContractor = !!ticket.contractor_rep_signature_url;
  const hasSupervisor = !!ticket.supervisor_signature_url;
  let label = "Draft";
  let cls = "bg-muted text-muted-foreground";
  if (hasSupervisor) {
    label = "Complete";
    cls = "bg-green-500/15 text-green-700 dark:text-green-400";
  } else if (hasContractor) {
    label = "Awaiting Supervisor";
    cls = "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  } else if (ticket.status && ticket.status !== "draft") {
    label = "Submitted";
    cls = "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

interface Props {
  incidentTruckId: string;
  incidentId: string;
  organizationId?: string;
  truckName?: string | null;
  truckMake?: string | null;
  truckModel?: string | null;
  truckVin?: string | null;
  truckPlate?: string | null;
  truckUnitType?: string | null;
  incidentName?: string;
}

export function ShiftTicketSection({
  incidentTruckId,
  incidentId,
  organizationId,
  truckName,
  truckMake,
  truckModel,
  truckVin,
  truckPlate,
  truckUnitType,
  incidentName,
}: Props) {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useShiftTickets(incidentTruckId);
  const deleteMutation = useDeleteShiftTicket(incidentTruckId);
  const duplicateMutation = useDuplicateShiftTicket(incidentTruckId);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);

  const navState = { truckName, truckMake, truckModel, truckVin, truckPlate, truckUnitType, incidentName };

  const handleBatchDownload = async () => {
    if (!tickets || tickets.length === 0) return;
    setBatchDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const t of tickets) {
        const { blob, fileName } = await generateOF297PdfBlob(t as ShiftTicket);
        zip.file(fileName, blob);
      }
      const truckLabel = truckUnitType || truckName || "Truck";
      const zipName = `${incidentName || "ShiftTickets"} - ${truckLabel} - All Tickets.zip`;
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = zipName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 500);
      toast.success(`Downloaded ${tickets.length} shift tickets`);
    } catch (err) {
      console.error("Batch download failed:", err);
      toast.error("Failed to generate batch download");
    } finally {
      setBatchDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Shift ticket deleted");
    } catch {
      toast.error("Failed to delete shift ticket");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = async (ticket: any) => {
    if (!organizationId) {
      toast.error("Organization not loaded");
      return;
    }
    try {
      const newTicket = await duplicateMutation.mutateAsync({ ticket, organizationId });
      toast.success("Shift ticket duplicated (dates advanced +1 day)");
      navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/${newTicket.id}`);
    } catch {
      toast.error("Failed to duplicate shift ticket");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-3 -mt-1">
        {tickets && tickets.length > 0 && (
          <button
            onClick={handleBatchDownload}
            disabled={batchDownloading}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground touch-target"
          >
            {batchDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download All
          </button>
        )}
        <button
          onClick={() => navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/new`, { state: navState })}
          className="flex items-center gap-1 text-xs font-bold text-primary touch-target"
        >
          <Plus className="h-3.5 w-3.5" /> New Ticket
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!tickets || tickets.length === 0) && (
        <p className="text-xs text-muted-foreground py-2 text-center">No shift tickets yet.</p>
      )}

      {tickets?.map((t) => {
        // Extract the shift date from equipment or personnel entries
        const entries = (t.equipment_entries as any[]) || [];
        const pEntries = (t.personnel_entries as any[]) || [];
        const shiftDate = entries[0]?.date || pEntries[0]?.date || null;
        const dateDisplay = shiftDate || new Date(t.updated_at).toLocaleDateString();
        // Build human-readable label: Incident Name - Truck Name - Date
        const nameParts: string[] = [];
        if (t.incident_name) nameParts.push(t.incident_name);
        // Prefer unit type (DL31, DL62) over truck name for the label
        const unitLabel = truckUnitType || (t as any).equipment_type || truckName;
        if (unitLabel) nameParts.push(unitLabel);
        if (dateDisplay) nameParts.push(dateDisplay);
        const label = nameParts.length > 0 ? nameParts.join(" - ") : "OF-297 Shift Ticket";
        return (
          <div
            key={t.id}
            className="flex w-full items-center gap-3 rounded-lg bg-secondary p-3"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <button
              onClick={() => navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/${t.id}`)}
              className="min-w-0 flex-1 text-left touch-target"
            >
              <p className="text-sm font-medium truncate">{label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusBadge ticket={t} />
                <span className="text-[10px] text-muted-foreground">{dateDisplay}</span>
              </div>
            </button>
            <button
              onClick={() => navigate(`/incidents/${incidentId}/trucks/${incidentTruckId}/shift-ticket/${t.id}`)}
              className="rounded-lg p-2 text-muted-foreground active:bg-accent touch-target"
              aria-label="Edit shift ticket"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDuplicate(t)}
              className="rounded-lg p-2 text-muted-foreground active:bg-accent touch-target"
              aria-label="Duplicate shift ticket"
              disabled={duplicateMutation.isPending}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteTarget({ id: t.id, label })}
              className="rounded-lg p-2 text-destructive active:bg-destructive/10 touch-target"
              aria-label="Delete shift ticket"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.label}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
