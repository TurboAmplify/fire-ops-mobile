import { AppShell } from "@/components/AppShell";
import { useRecentShiftTickets } from "@/hooks/useShiftTickets";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, Pencil, FileDown, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Trash2, AlertTriangle, Eye, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PersonnelEntry, ShiftTicket } from "@/services/shift-tickets";
import { deleteShiftTicket } from "@/services/shift-tickets";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateOF297Pdf, generateOF297PdfBlob } from "@/components/shift-tickets/generateOF297Pdf";
import { useOrganization } from "@/hooks/useOrganization";

function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  // YYYY-MM-DD strings must be parsed as LOCAL dates, not UTC,
  // otherwise `new Date("2026-04-12")` becomes 4/11 in US timezones.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  try {
    if (ymd) {
      const [, y, m, d] = ymd;
      return format(new Date(Number(y), Number(m) - 1, Number(d)), "M/d/yy");
    }
    return format(new Date(dateStr), "M/d/yy");
  } catch {
    return dateStr;
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "M/d/yy h:mm a");
  } catch {
    return "—";
  }
}

function summarizePerDiem(entries: PersonnelEntry[]): string {
  const meals = new Set<string>();
  let lodging = false;
  for (const e of entries ?? []) {
    if (e.per_diem_b) meals.add("B");
    if (e.per_diem_l) meals.add("L");
    if (e.per_diem_d) meals.add("D");
    if (e.lodging) lodging = true;
  }
  const parts: string[] = [];
  if (meals.size > 0) parts.push(["B", "L", "D"].filter((m) => meals.has(m)).join("/"));
  if (lodging) parts.push("Lodging");
  return parts.length ? parts.join(" + ") : "—";
}

// "Lunch" in the log = a 30-min unpaid lunch break taken on shift.
// On the form this is the "Lunch" chip in CrewSyncCard which writes
// "30-min lunch at HHMM" into the entry remarks. It is intentionally
// separate from the Per Diem "L" meal allowance.
function lunchStatus(entries: PersonnelEntry[]): { label: string; tone: "ok" | "muted" } {
  const anyLunch = (entries ?? []).some(
    (e) => /30-?min lunch/i.test(e.remarks || "") || e.per_diem_l
  );
  return anyLunch ? { label: "Lunch", tone: "ok" } : { label: "No lunch", tone: "muted" };
}

function isFinalizable(t: { contractor_rep_signed_at: string | null; supervisor_signed_at: string | null }): boolean {
  return !!(t.contractor_rep_signed_at && t.supervisor_signed_at);
}

function statusReason(t: { status: string; contractor_rep_signed_at: string | null; supervisor_signed_at: string | null }): string {
  if (t.status === "final") return "Both signatures captured — ticket is final.";
  const missing: string[] = [];
  if (!t.contractor_rep_signed_at) missing.push("contractor");
  if (!t.supervisor_signed_at) missing.push("supervisor");
  return missing.length === 0
    ? "Save the ticket to mark it final."
    : `Awaiting ${missing.join(" & ")} signature${missing.length > 1 ? "s" : ""} to finalize.`;
}

function crewSummary(entries: PersonnelEntry[]): string {
  const names = (entries ?? [])
    .map((e) => e.operator_name?.trim())
    .filter((n): n is string => !!n);
  const unique = Array.from(new Set(names));
  if (unique.length === 0) return "—";
  if (unique.length <= 2) return unique.join(", ");
  return `${unique.slice(0, 2).join(", ")} +${unique.length - 2}`;
}

function ticketDate(ticket: { equipment_entries: any[]; personnel_entries: any[]; created_at: string }): string {
  const eq = ticket.equipment_entries?.[0]?.date;
  const pp = ticket.personnel_entries?.[0]?.date;
  return eq || pp || ticket.created_at;
}

type SelectedTicket = {
  ticket: ShiftTicket;
  incidentId: string | null | undefined;
  truckName: string;
  dateLabel: string;
};

type SortKey = "date" | "truck" | "crew" | "lunch" | "perDiem" | "contractor" | "supervisor" | "status";
type SortDir = "asc" | "desc";

export default function ShiftTicketLog() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useOrganization();
  // refetchOnMount + refetchOnWindowFocus ensure changes from the edit page show up on return
  const { data: tickets, isLoading } = useRecentShiftTickets(200);
  const [selected, setSelected] = useState<SelectedTicket | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteTarget, setDeleteTarget] = useState<SelectedTicket | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const handleEdit = () => {
    if (!selected?.incidentId) {
      toast.error("Incident not available for this ticket");
      return;
    }
    const t = selected.ticket;
    setSelected(null);
    navigate(`/incidents/${selected.incidentId}/trucks/${t.incident_truck_id}/shift-ticket/${t.id}`);
  };

  const handleViewPdf = async () => {
    if (!selected) return;
    setViewLoading(true);
    try {
      const { blob, fileName } = await generateOF297PdfBlob(selected.ticket);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfPreviewTitle(fileName);
      setSelected(null);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selected) return;
    setDownloadLoading(true);
    try {
      await generateOF297Pdf(selected.ticket);
      setSelected(null);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadLoading(false);
    }
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfPreviewTitle("");
  };

  const openDeleteDialog = () => {
    if (!selected) return;
    setDeleteTarget(selected);
    setDeleteConfirmText("");
    setSelected(null);
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteConfirmText("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toLowerCase() !== "delete") return;
    setDeleteLoading(true);
    try {
      await deleteShiftTicket(deleteTarget.ticket.id);
      await qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
      await qc.invalidateQueries({
        queryKey: ["shift-tickets", deleteTarget.ticket.incident_truck_id],
      });
      toast.success("Shift ticket deleted");
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete shift ticket");
    } finally {
      setDeleteLoading(false);
    }
  };

  const sortedTickets = (() => {
    if (!tickets) return tickets;
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: string | number, b: string | number) =>
      a < b ? -1 * dir : a > b ? 1 * dir : 0;
    const keyFor = (t: (typeof tickets)[number]): string | number => {
      switch (sortKey) {
        case "date":
          return ticketDate(t);
        case "truck":
          return (t.incident_trucks?.trucks?.name ?? "").toLowerCase();
        case "crew":
          return crewSummary(t.personnel_entries).toLowerCase();
        case "lunch":
          return lunchStatus(t.personnel_entries).tone === "ok" ? 1 : 0;
        case "perDiem":
          return summarizePerDiem(t.personnel_entries).toLowerCase();
        case "contractor":
          return t.contractor_rep_signed_at ?? "";
        case "supervisor":
          return t.supervisor_signed_at ?? "";
        case "status":
          return t.status ?? "";
      }
    };
    return [...tickets].sort((a, b) => cmp(keyFor(a), keyFor(b)));
  })();

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 uppercase tracking-wider text-[11px] ${
            active ? "text-foreground" : "text-muted-foreground"
          } hover:text-foreground transition-colors`}
        >
          {label}
          <Icon className="h-3 w-3" />
        </button>
      </th>
    );
  };

  return (
    <AppShell title="Shift Ticket Log">
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <p className="flex-1">
            All shift tickets across incidents. Tap a row for actions.
          </p>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="What does Draft vs Final mean?"
                  className="touch-target inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                  Draft vs Final
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="max-w-[260px] text-xs">
                A ticket becomes <span className="font-semibold">Final</span> automatically once both the contractor and supervisor signatures are captured. Until then it stays a <span className="font-semibold">Draft</span>.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-card card-shadow p-6 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}

        {!isLoading && (!tickets || tickets.length === 0) && (
          <div className="rounded-2xl bg-card card-shadow p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-medium">No shift tickets yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create one from an incident truck to see it here.
            </p>
          </div>
        )}

        {!isLoading && tickets && tickets.length > 0 && (
          <>
            {/* Mobile: card list (no horizontal scroll) */}
            <div className="md:hidden space-y-2">
              {(sortedTickets ?? []).map((t) => {
                const dateStr = ticketDate(t);
                const dateLabel = formatDateSafe(dateStr);
                const lunch = lunchStatus(t.personnel_entries);
                const perDiem = summarizePerDiem(t.personnel_entries);
                const crew = crewSummary(t.personnel_entries);
                const truckName = t.incident_trucks?.trucks?.name ?? "—";
                const incidentId = t.incident_trucks?.incident_id;
                const onClick = () =>
                  setSelected({
                    ticket: t as unknown as ShiftTicket,
                    incidentId,
                    truckName,
                    dateLabel,
                  });
                return (
                  <button
                    key={t.id}
                    onClick={onClick}
                    className="w-full text-left rounded-2xl bg-card card-shadow p-3 active:bg-secondary/40 transition-colors touch-target"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{dateLabel}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm font-medium truncate">{truckName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{crew}</p>
                      </div>
                      <Badge
                        variant={t.status === "final" ? "default" : "outline"}
                        className="capitalize font-normal shrink-0"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                      {lunch.tone === "ok" ? (
                        <Badge variant="secondary" className="font-normal h-5 px-1.5">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Lunch
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal h-5 px-1.5">
                          No lunch
                        </Badge>
                      )}
                      {perDiem !== "—" && (
                        <Badge variant="outline" className="font-normal h-5 px-1.5">
                          {perDiem}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1">
                        {t.contractor_rep_signed_at ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        Contractor
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {t.supervisor_signed_at ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        Supervisor
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop/tablet: full table */}
            <div className="hidden md:block rounded-2xl bg-card card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <SortHeader label="Date" k="date" />
                      <SortHeader label="Truck" k="truck" />
                      <SortHeader label="Crew" k="crew" />
                      <SortHeader label="Lunch" k="lunch" />
                      <SortHeader label="Per Diem" k="perDiem" />
                      <SortHeader label="Contractor Sig" k="contractor" />
                      <SortHeader label="Supervisor Sig" k="supervisor" />
                      <SortHeader label="Status" k="status" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(sortedTickets ?? []).map((t) => {
                      const dateStr = ticketDate(t);
                      const dateLabel = formatDateSafe(dateStr);
                      const lunch = lunchStatus(t.personnel_entries);
                      const perDiem = summarizePerDiem(t.personnel_entries);
                      const crew = crewSummary(t.personnel_entries);
                      const truckName = t.incident_trucks?.trucks?.name ?? "—";
                      const incidentId = t.incident_trucks?.incident_id;
                      const onClick = () =>
                        setSelected({
                          ticket: t as unknown as ShiftTicket,
                          incidentId,
                          truckName,
                          dateLabel,
                        });
                      return (
                        <tr
                          key={t.id}
                          onClick={onClick}
                          className="cursor-pointer active:bg-secondary/40 transition-colors"
                        >
                          <td className="px-3 py-3 whitespace-nowrap font-medium">{dateLabel}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{truckName}</td>
                          <td className="px-3 py-3 min-w-[160px]">{crew}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {lunch.tone === "ok" ? (
                              <Badge variant="secondary" className="font-normal">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Lunch
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">No lunch</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">{perDiem}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {t.contractor_rep_signed_at ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                <span>{formatTime(t.contractor_rep_signed_at)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {t.supervisor_signed_at ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                <span>{formatTime(t.supervisor_signed_at)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <Badge
                              variant={t.status === "final" ? "default" : "outline"}
                              className="capitalize font-normal"
                            >
                              {t.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shift Ticket</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.truckName} — ${selected.dateLabel}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Crew</span>
                <span className="text-right font-medium">
                  {crewSummary(selected.ticket.personnel_entries)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Lunch</span>
                <span className="text-right font-medium">
                  {lunchStatus(selected.ticket.personnel_entries).tone === "ok" ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Per diem</span>
                <span className="text-right font-medium">
                  {summarizePerDiem(selected.ticket.personnel_entries)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Contractor sig</span>
                <span className="text-right font-medium">
                  {selected.ticket.contractor_rep_signed_at
                    ? formatTime(selected.ticket.contractor_rep_signed_at)
                    : "Pending"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Supervisor sig</span>
                <span className="text-right font-medium">
                  {selected.ticket.supervisor_signed_at
                    ? formatTime(selected.ticket.supervisor_signed_at)
                    : "Pending"}
                </span>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={selected.ticket.status === "final" ? "default" : "outline"}
                  className="capitalize font-normal"
                >
                  {selected.ticket.status}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug -mt-1">
                {statusReason(selected.ticket)}
              </p>
            </div>
          )}
          <div className="grid gap-2 pt-2">
            <button
              onClick={handleEdit}
              disabled={!selected?.incidentId}
              className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-medium active:bg-secondary/70 transition-colors disabled:opacity-50 touch-target"
            >
              <Pencil className="h-4 w-4 text-primary" />
              <span className="flex-1">Edit ticket</span>
            </button>
            <button
              onClick={handleViewPdf}
              disabled={viewLoading}
              className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-medium active:bg-secondary/70 transition-colors disabled:opacity-50 touch-target"
            >
              {viewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
              <span className="flex-1">View PDF</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadLoading}
              className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-medium active:bg-secondary/70 transition-colors disabled:opacity-50 touch-target"
            >
              {downloadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <FileDown className="h-4 w-4 text-primary" />
              )}
              <span className="flex-1">Download PDF</span>
            </button>
            <button
              onClick={openDeleteDialog}
              className="flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-left text-sm font-medium text-destructive active:bg-destructive/20 transition-colors touch-target"
            >
              <Trash2 className="h-4 w-4" />
              <span className="flex-1">Delete ticket</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => !open && closePdfPreview()}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base truncate pr-8">{pdfPreviewTitle || "Shift Ticket PDF"}</DialogTitle>
          </DialogHeader>
          {pdfPreviewUrl && (
            <iframe
              src={pdfPreviewUrl}
              title="Shift Ticket PDF"
              className="flex-1 w-full bg-muted"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete shift ticket?
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This will permanently delete the shift ticket for ${deleteTarget.truckName} on ${deleteTarget.dateLabel}. This action cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <label className="text-sm font-medium">
              Type <span className="font-mono font-bold">delete</span> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={deleteLoading}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                deleteLoading || deleteConfirmText.trim().toLowerCase() !== "delete"
              }
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
