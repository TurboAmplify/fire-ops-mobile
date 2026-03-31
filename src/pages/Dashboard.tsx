import { AppShell } from "@/components/AppShell";
import { Flame, Clock, DollarSign, Truck, ChevronRight, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";

const quickLinks = [
  { label: "Incidents", icon: Flame, to: "/incidents", desc: "Active fires", color: "from-red-600/20 to-orange-600/10" },
  { label: "Fleet", icon: Truck, to: "/fleet", desc: "Trucks & equipment", color: "from-blue-600/20 to-cyan-600/10" },
  { label: "Time", icon: Clock, to: "/time", desc: "Shift tracking", color: "from-amber-600/20 to-yellow-600/10" },
  { label: "Expenses", icon: DollarSign, to: "/expenses", desc: "Receipts & costs", color: "from-emerald-600/20 to-green-600/10" },
];

export default function Dashboard() {
  const { data: incidents } = useIncidents();
  const { data: trucks } = useTrucks();
  const { data: crew } = useCrewMembers();

  const activeCount = incidents?.filter((i) => i.status === "active").length ?? 0;
  const truckCount = trucks?.length ?? 0;
  const crewCount = crew?.filter((c) => c.active).length ?? 0;

  return (
    <AppShell title="FireOps HQ">
      <div className="space-y-5 p-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-card p-4 card-shadow text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-destructive/15 mx-auto mb-2">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-2xl font-extrabold">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Active</p>
          </div>
          <div className="rounded-2xl bg-card p-4 card-shadow text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/15 mx-auto mb-2">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-extrabold">{truckCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Trucks</p>
          </div>
          <div className="rounded-2xl bg-card p-4 card-shadow text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-success/15 mx-auto mb-2">
              <Users className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-extrabold">{crewCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Crew</p>
          </div>
        </div>

        {/* Quick actions */}
        <section>
          <h2 className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative overflow-hidden flex items-center gap-3 rounded-2xl bg-card p-3.5 card-shadow transition-all duration-150 active:scale-[0.97] active:shadow-none"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-50`} />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                  <link.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="relative min-w-0">
                  <p className="text-sm font-semibold">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent incidents */}
        <section>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
              <div className="rounded-2xl bg-card p-6 text-center card-shadow">
                <Flame className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No incidents yet</p>
                <Link to="/incidents/new" className="text-xs font-semibold text-primary mt-1 inline-block">
                  Create your first incident
                </Link>
              </div>
            )}
            {incidents?.slice(0, 3).map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="flex items-center justify-between rounded-2xl bg-card p-4 card-shadow transition-all duration-150 active:scale-[0.98] active:shadow-none"
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
    </AppShell>
  );
}
