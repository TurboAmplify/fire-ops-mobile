import { AppShell } from "@/components/AppShell";
import { useRecentShiftTickets } from "@/hooks/useShiftTickets";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import type { PersonnelEntry } from "@/services/shift-tickets";

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
  return anyLunch
    ? { label: "Lunch", tone: "ok" }
    : { label: "No lunch", tone: "muted" };
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

export default function ShiftTicketLog() {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useRecentShiftTickets(200);

  return (
    <AppShell title="Shift Ticket Log">
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          All shift tickets across incidents. Tap a row to open the ticket.
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
                    const lunch = lunchStatus(t.personnel_entries);
                    const perDiem = summarizePerDiem(t.personnel_entries);
                    const crew = crewSummary(t.personnel_entries);
                    const truckName = t.incident_trucks?.trucks?.name ?? "—";
                    const incidentId = t.incident_trucks?.incident_id;
                    const canNavigate = !!incidentId;
                    const onClick = () => {
                      if (canNavigate) {
                        navigate(`/incidents/${incidentId}/trucks/${t.incident_truck_id}/shift-ticket/${t.id}`);
                      }
                    };
                    return (
                      <tr
                        key={t.id}
                        onClick={onClick}
                        className={`${canNavigate ? "cursor-pointer active:bg-secondary/40" : ""} transition-colors`}
                      >
                        <td className="px-3 py-3 whitespace-nowrap font-medium">{formatDateSafe(dateStr)}</td>
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
    </AppShell>
  );
}
