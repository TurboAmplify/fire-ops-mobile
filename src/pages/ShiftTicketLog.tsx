import { AppShell } from "@/components/AppShell";
import { useRecentShiftTickets } from "@/hooks/useShiftTickets";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, Pencil, FileDown, Loader2 } from "lucide-react";
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
import { generateOF297Pdf } from "@/components/shift-tickets/generateOF297Pdf";

function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
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

export default function ShiftTicketLog() {
  const navigate = useNavigate();
  // refetchOnMount + refetchOnWindowFocus ensure changes from the edit page show up on return
  const { data: tickets, isLoading } = useRecentShiftTickets(200);
  const [selected, setSelected] = useState<SelectedTicket | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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
    setPdfLoading(true);
    try {
      await generateOF297Pdf(selected.ticket);
      setSelected(null);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
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
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Date</th>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Truck</th>
                    <th className="text-left font-semibold px-3 py-2.5">Crew</th>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Lunch</th>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Per Diem</th>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Contractor Sig</th>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Supervisor Sig</th>
                    <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tickets.map((t) => {
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
              disabled={pdfLoading}
              className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-medium active:bg-secondary/70 transition-colors disabled:opacity-50 touch-target"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <FileDown className="h-4 w-4 text-primary" />
              )}
              <span className="flex-1">View / download PDF</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
