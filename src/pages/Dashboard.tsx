import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Flame, Truck, Clock, Receipt, Users, ChevronRight, FileText, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { ShiftTicketQuickAccess } from "@/components/shift-tickets/ShiftTicketQuickAccess";
import heroBg from "@/assets/hero-bg.jpg";
import fireLogo from "@/assets/fire-logo.png";
import type { LucideIcon } from "lucide-react";

export default function Dashboard() {
  const [showTickets, setShowTickets] = useState(false);
  const navigate = useNavigate();
  const { data: incidents } = useIncidents();
  const { data: trucks } = useTrucks();
  const { data: crew } = useCrewMembers();

  const activeCount = incidents?.filter((i) => i.status === "active").length ?? 0;
  const truckCount = trucks?.length ?? 0;
  const crewCount = crew?.filter((c) => c.active).length ?? 0;

  return (
    <AppShell title="FireOps HQ" headerRight={
      <button onClick={() => navigate("/settings")} className="flex items-center justify-center h-9 w-9 rounded-full active:bg-secondary transition-colors">
        <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
      </button>
    }>
      <div className="space-y-5">
        {/* Cinematic hero */}
        <div className="relative overflow-hidden">
          <img
            src={heroBg}
            alt=""
            className="w-full h-56 object-cover"
            width={1280}
            height={640}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
          {/* Command bar accent */}
          <div className="absolute top-0 left-0 right-0 h-1 fire-gradient" />
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
            <div className="flex items-end gap-3">
              <img src={fireLogo} alt="FireOps" className="h-11 w-11 shrink-0" width={512} height={512} />
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">FireOps HQ</h2>
                <p className="text-[11px] text-white/50 font-medium tracking-wide uppercase">Wildfire Operations Command</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={activeCount} label="Active" icon={Flame} variant="destructive" />
            <StatCard value={truckCount} label="Trucks" icon={Truck} variant="primary" />
            <StatCard value={crewCount} label="Crew" icon={Users} variant="muted" />
          </div>

          {/* Operations grid */}
          <section>
            <h2 className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-0.5">
              Operations
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <GridTile to="/incidents" icon={Flame} label="Incidents" variant="destructive" />
              <GridTile to="/fleet" icon={Truck} label="Fleet" />
              <GridTile to="/time" icon={Clock} label="Time" />
              <GridTile to="/expenses" icon={Receipt} label="Expenses" />
              <GridTile to="/crew" icon={Users} label="Crew" />
              <button
                onClick={() => setShowTickets(true)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card p-4 card-shadow border border-border/20 transition-all duration-150 active:scale-[0.98] active:shadow-none aspect-square"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">Tickets</span>
              </button>
            </div>
          </section>

          {/* Recent incidents */}
          <section>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                Recent Incidents
              </h2>
              {incidents && incidents.length > 3 && (
                <Link to="/incidents" className="text-xs font-semibold text-primary flex items-center gap-0.5">
                  See All <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {(!incidents || incidents.length === 0) && (
                <div className="rounded-2xl bg-card p-6 text-center card-shadow border border-border/30">
                  <Flame className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No incidents yet</p>
                  <Link to="/incidents/new" className="text-xs font-semibold text-primary mt-1.5 inline-block">
                    Create your first incident
                  </Link>
                </div>
              )}
              {incidents?.slice(0, 3).map((inc) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-center justify-between rounded-2xl bg-card p-4 card-shadow border border-border/20 transition-all duration-150 active:scale-[0.98] active:shadow-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[15px]">{inc.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{inc.location}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      inc.status === "active"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-success/15 text-success"
                    }`}
                  >
                    {inc.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
      <ShiftTicketQuickAccess open={showTickets} onOpenChange={setShowTickets} />
    </AppShell>
  );
}

function StatCard({ value, label, icon: Icon, variant }: { value: number; label: string; icon: LucideIcon; variant: string }) {
  return (
    <div className="rounded-2xl bg-card p-3.5 card-shadow border border-border/20 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1.5 ${
        variant === "destructive" ? "text-destructive" : variant === "primary" ? "text-primary" : "text-muted-foreground"
      }`} strokeWidth={1.75} />
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 text-muted-foreground">{label}</p>
    </div>
  );
}

function GridTile({ to, icon: Icon, label, variant }: { to: string; icon: LucideIcon; label: string; variant?: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card p-4 card-shadow border border-border/20 transition-all duration-150 active:scale-[0.98] active:shadow-none aspect-square"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${variant === "destructive" ? "bg-destructive/15" : "bg-secondary"}`}>
        <Icon className={`h-5 w-5 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} strokeWidth={1.75} />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    </Link>
  );
}