import { AppShell } from "@/components/AppShell";
import { useRecentShiftTickets } from "@/hooks/useShiftTickets";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, Pencil, FileDown, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { PersonnelEntry, ShiftTicket } from "@/services/shift-tickets";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateOF297Pdf, generateOF297PdfBlob } from "@/components/shift-tickets/generateOF297Pdf";
import { Eye } from "lucide-react";

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

function lunchStatus(entries: PersonnelEntry[]): { label: string; tone: "ok" | "muted" } {
  const anyLunch = (entries ?? []).some((e) => e.per_diem_l);
  return anyLunch ? { label: "Lunch", tone: "ok" } : { label: "No lunch", tone: "muted" };
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
  // refetchOnMount + refetchOnWindowFocus ensure changes from the edit page show up on return
  const { data: tickets, isLoading } = useRecentShiftTickets(200);
  const [selected, setSelected] = useState<SelectedTicket | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
        <p className="text-sm text-muted-foreground">
          All shift tickets across incidents. Tap a row for actions.
        </p>

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
          <div className="rounded-2xl bg-card card-shadow overflow-hidden">
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
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Shift Ticket</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.truckName} — ${selected.dateLabel}` : ""}
            </DialogDescription>
          </DialogHeader>
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
    </AppShell>
  );
}
