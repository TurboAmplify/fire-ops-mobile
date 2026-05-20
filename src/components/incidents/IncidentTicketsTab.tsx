import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, FileText, ChevronRight, Truck as TruckIcon, Camera, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { useShiftTickets, useDeleteShiftTicket } from "@/hooks/useShiftTickets";
import { getLocalDateString } from "@/lib/local-date";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickAttachPaperTicketSheet } from "@/components/shift-tickets/QuickAttachPaperTicketSheet";

interface Props {
  incidentId: string;
  incidentName?: string;
}

type TicketRow = {
  id: string;
  incident_truck_id: string;
  status: string | null;
  contractor_rep_signature_url: string | null;
  supervisor_signature_url: string | null;
  equipment_entries: any;
  personnel_entries: any;
  updated_at: string;
};

function getShiftDate(t: TicketRow): string {
  const eq = (t.equipment_entries as any[]) || [];
  const pe = (t.personnel_entries as any[]) || [];
  return eq[0]?.date || pe[0]?.date || (t.updated_at?.split("T")[0] ?? "");
}

function statusFor(t: TicketRow): { label: string; cls: string } {
  if (t.supervisor_signature_url) return { label: "Complete", cls: "bg-green-500/15 text-green-700 dark:text-green-400" };
  if (t.contractor_rep_signature_url) return { label: "Awaiting Supervisor", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (t.status && t.status !== "draft") return { label: "Submitted", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
  return { label: "Draft", cls: "bg-muted text-muted-foreground" };
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  const today = getLocalDateString();
  if (dateStr === today) return "Today";
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = dateStr.split("-").map(Number);
  if (!ty || !dy) return dateStr;
  const diffDays = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(dy, dm - 1, dd)) / 86_400_000
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

/**
 * Tickets-tab — purpose-built for fast shift-ticket creation and review.
 * Big "+ New Shift Ticket" CTA at the top, today's tickets per truck, then recent.
 */
export function IncidentTicketsTab({ incidentId, incidentName }: Props) {
  const navigate = useNavigate();
  const { data: trucks, isLoading: loadingTrucks } = useIncidentTrucks(incidentId);
  const [showTruckPicker, setShowTruckPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"new" | "import">("new");
  const [showQuickAttach, setShowQuickAttach] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; incidentTruckId: string; label: string; supervisorSigned: boolean } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  // null = "All trucks"
  const [truckFilter, setTruckFilter] = useState<string | null>(null);
  // Use any truck id for invalidation key; actual write goes through service
  const deleteMutation = useDeleteShiftTicket(deleteTarget?.incidentTruckId ?? "");

  // Fetch all tickets for this incident in one query
  const truckIds = useMemo(() => trucks?.map((t) => t.id) ?? [], [trucks]);
  const { data: allTickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["incident-tickets", incidentId, truckIds],
    queryFn: async () => {
      if (truckIds.length === 0) return [] as TicketRow[];
      const { data, error } = await supabase
        .from("shift_tickets")
        .select("id, incident_truck_id, status, contractor_rep_signature_url, supervisor_signature_url, equipment_entries, personnel_entries, updated_at")
        .in("incident_truck_id", truckIds)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
    enabled: truckIds.length > 0,
  });

  const truckById = useMemo(() => {
    const m = new Map<string, { name: string; unit_type: string | null }>();
    trucks?.forEach((t) => m.set(t.id, { name: t.trucks.name, unit_type: t.trucks.unit_type }));
    return m;
  }, [trucks]);

  const today = getLocalDateString();
  const todays: TicketRow[] = [];
  const recent: TicketRow[] = [];
  const filtered = (allTickets ?? []).filter(
    (t) => !truckFilter || t.incident_truck_id === truckFilter,
  );
  filtered.forEach((t) => {
    if (getShiftDate(t) === today) todays.push(t);
    else recent.push(t);
  });
  // Sort recent by shift date desc
  recent.sort((a, b) => getShiftDate(b).localeCompare(getShiftDate(a)));

  const handleNewClick = (mode: "new" | "import" = "new") => {
    if (!trucks || trucks.length === 0) return;
    if (trucks.length === 1) {
      navigate(`/incidents/${incidentId}/trucks/${trucks[0].id}/shift-ticket/new`, {
        state: {
          incidentName,
          truckName: trucks[0].trucks.name,
          truckUnitType: trucks[0].trucks.unit_type,
          openImport: mode === "import",
        },
      });
      return;
    }
    setPickerMode(mode);
    setShowTruckPicker(true);
  };

  const openTicket = (t: TicketRow) => {
    navigate(`/incidents/${incidentId}/trucks/${t.incident_truck_id}/shift-ticket/${t.id}`);
  };

  const renderTicket = (t: TicketRow) => {
    const truck = truckById.get(t.incident_truck_id);
    const truckLabel = truck?.unit_type || truck?.name || "Truck";
    const dateStr = getShiftDate(t);
    const status = statusFor(t);
    const label = `${truckLabel} - ${fmtDate(dateStr)}`;
    return (
      <div
        key={t.id}
        className="relative flex w-full items-center gap-3 rounded-xl bg-card border border-border/30 p-3 card-shadow"
      >
        <button
          onClick={() => openTicket(t)}
          className="flex flex-1 items-center gap-3 text-left active:scale-[0.99] transition-transform touch-target min-w-0"
        >
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate pr-20">{truckLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(dateStr)}</p>
          </div>
        </button>
        <span className={`absolute right-10 top-3 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-lg p-2 text-muted-foreground active:bg-accent touch-target"
              aria-label="Ticket actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => setDeleteTarget({
                id: t.id,
                incidentTruckId: t.incident_truck_id,
                label,
                supervisorSigned: !!t.supervisor_signature_url,
              })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const reason = deleteReason.trim();
    if (!reason) {
      toast.error("Please enter a reason for deleting this ticket");
      return;
    }
    if (deleteTarget.supervisorSigned && deleteConfirm.trim().toLowerCase() !== "delete") {
      toast.error('Type "delete" to confirm');
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id, reason });
      toast.success("Shift ticket deleted");
    } catch {
      toast.error("Failed to delete shift ticket");
    } finally {
      setDeleteTarget(null);
      setDeleteReason("");
      setDeleteConfirm("");
    }
  };

  const isLoading = loadingTrucks || loadingTickets;
  const noTrucks = !loadingTrucks && (!trucks || trucks.length === 0);

  return (
    <div className="space-y-5">
      {/* Primary CTA + Import */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={() => handleNewClick("new")}
          disabled={noTrucks}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md active:scale-[0.99] transition-transform touch-target disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
          New Shift Ticket
        </button>
        <button
          onClick={() => setShowQuickAttach(true)}
          disabled={noTrucks}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 py-4 text-sm font-bold text-primary active:scale-[0.99] transition-transform touch-target disabled:opacity-40"
        >
          <Camera className="h-5 w-5" />
          Attach paper ticket
        </button>
      </div>

      {/* Truck filter chips — only when 2+ trucks */}
      {trucks && trucks.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-1 px-1">
          <button
            onClick={() => setTruckFilter(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors touch-target ${
              truckFilter === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            All
          </button>
          {trucks.map((it) => (
            <button
              key={it.id}
              onClick={() => setTruckFilter(it.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors touch-target ${
                truckFilter === it.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {it.trucks.name}
            </button>
          ))}
        </div>
      )}

      {noTrucks && (
        <p className="text-xs text-muted-foreground text-center">
          Assign a truck to this incident first.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Today */}
      {!isLoading && todays.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Today</p>
          <div className="space-y-2">{todays.map(renderTicket)}</div>
        </section>
      )}

      {/* Recent */}
      {!isLoading && recent.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Recent</p>
          <div className="space-y-2">{recent.slice(0, 10).map(renderTicket)}</div>
        </section>
      )}

      {!isLoading && allTickets && allTickets.length === 0 && !noTrucks && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No shift tickets yet. Tap "New Shift Ticket" to create one.
        </p>
      )}

      {/* Truck picker bottom sheet */}
      <Sheet open={showTruckPicker} onOpenChange={setShowTruckPicker}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{pickerMode === "import" ? "Import for which truck?" : "Select a truck"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-4">
            {trucks?.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  setShowTruckPicker(false);
                  navigate(`/incidents/${incidentId}/trucks/${it.id}/shift-ticket/new`, {
                    state: {
                      incidentName,
                      truckName: it.trucks.name,
                      truckUnitType: it.trucks.unit_type,
                      openImport: pickerMode === "import",
                    },
                  });
                }}
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
        </SheetContent>
      </Sheet>

      {/* One-tap paper ticket attach */}
      <QuickAttachPaperTicketSheet
        open={showQuickAttach}
        onClose={() => setShowQuickAttach(false)}
        incidentId={incidentId}
        incidentName={incidentName}
        defaultIncidentTruckId={trucks?.length === 1 ? trucks[0].id : undefined}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteReason("");
            setDeleteConfirm("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.label}" will be removed from all views and accounting. A copy stays in the backend for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Reason for deletion <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. duplicate ticket, test entry, wrong incident"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            {deleteTarget?.supervisorSigned && (
              <>
                <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  ⚠ Supervisor has signed this ticket. Type <span className="font-mono font-bold">delete</span> below to confirm.
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="delete"
                  autoComplete="off"
                  autoCapitalize="off"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={
                deleteMutation.isPending ||
                !deleteReason.trim() ||
                (deleteTarget?.supervisorSigned && deleteConfirm.trim().toLowerCase() !== "delete")
              }
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
