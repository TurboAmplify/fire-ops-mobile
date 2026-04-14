import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Flame, Truck, Clock, Receipt, Users, ChevronRight, FileText, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { ShiftTicketQuickAccess } from "@/components/shift-tickets/ShiftTicketQuickAccess";
import type { LucideIcon } from "lucide-react";

export default function Dashboard() {
  const [showTickets, setShowTickets] = useState(false);
  const navigate = useNavigate();
  const { data: incidents } = useIncidents();
  const { data: trucks } = useTrucks();
  const { data: crew } = useCrewMembers();

  const activeIncidents = incidents?.filter((i) => i.status === "active") ?? [];
  const activeCount = activeIncidents.length;
  const truckCount = trucks?.length ?? 0;
  const crewCount = crew?.filter((c) => c.active).length ?? 0;

  return (
    <AppShell title="FireOps HQ" headerRight={
      <button onClick={() => navigate("/settings")} className="flex items-center justify-center h-9 w-9 rounded-full active:bg-secondary transition-colors">
        <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
      </button>
    }>
      <div className="px-4 pt-4 space-y-6">
        {/* Operations grid with badge counts */}
        <section>
          <h2 className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-0.5">
            Operations
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <GridTile to="/incidents" icon={Flame} label="Incidents" variant="destructive" badge={activeCount || undefined} />
            <GridTile to="/fleet" icon={Truck} label="Fleet" badge={truckCount || undefined} />
            <GridTile to="/time" icon={Clock} label="Time" />
            <GridTile to="/expenses" icon={Receipt} label="Expenses" />
            <GridTile to="/crew" icon={Users} label="Crew" badge={crewCount || undefined} />
            <button
              onClick={() => setShowTickets(true)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card p-4 card-shadow border border-border/20 transition-all duration-150 active:scale-[0.98] active:shadow-none aspect-square relative"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">Tickets</span>
            </button>
          </div>
        </section>

        {/* Active incidents only */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Active Incidents
            </h2>
            {incidents && incidents.length > 0 && (
              <Link to="/incidents" className="text-xs font-semibold text-primary flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {activeIncidents.length === 0 && (
              <div className="rounded-2xl bg-card p-5 text-center card-shadow border border-border/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 mx-auto mb-2">
                  <Flame className="h-5 w-5 text-success" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-semibold">All Clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No active incidents</p>
              </div>
            )}
            {activeIncidents.map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="flex items-center justify-between rounded-2xl bg-card p-4 card-shadow border border-border/20 transition-all duration-150 active:scale-[0.98] active:shadow-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px]">{inc.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inc.location}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive">
                  Active
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <ShiftTicketQuickAccess open={showTickets} onOpenChange={setShowTickets} />
    </AppShell>
  );
}

function GridTile({ to, icon: Icon, label, variant, badge }: { to: string; icon: LucideIcon; label: string; variant?: string; badge?: number }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card p-4 card-shadow border border-border/20 transition-all duration-150 active:scale-[0.98] active:shadow-none aspect-square relative"
    >
      {badge !== undefined && (
        <span className="absolute top-2 right-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
          {badge}
        </span>
      )}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${variant === "destructive" ? "bg-destructive/15" : "bg-secondary"}`}>
        <Icon className={`h-5 w-5 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} strokeWidth={1.75} />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    </Link>
  );
}
