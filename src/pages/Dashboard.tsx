import { AppShell } from "@/components/AppShell";
import { Clock, DollarSign, Truck, ChevronRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import heroBg from "@/assets/hero-bg.jpg";
import fireLogo from "@/assets/fire-logo.png";

export default function Dashboard() {
  const { data: incidents } = useIncidents();
  const { data: trucks } = useTrucks();
  const { data: crew } = useCrewMembers();

  const activeCount = incidents?.filter((i) => i.status === "active").length ?? 0;
  const truckCount = trucks?.length ?? 0;
  const crewCount = crew?.filter((c) => c.active).length ?? 0;

  return (
    <AppShell title="FireOps HQ">
      <div className="space-y-5">
        {/* Cinematic hero with real photo */}
        <div className="relative overflow-hidden">
          <img
            src={heroBg}
            alt=""
            className="w-full h-52 object-cover"
            width={1280}
            height={640}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
            <div className="flex items-end gap-3">
              <img src={fireLogo} alt="FireOps" className="h-11 w-11 shrink-0" width={512} height={512} />
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">FireOps HQ</h2>
                <p className="text-xs text-white/60 font-medium">Wildfire Operations Command</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard value={activeCount} label="Active" color="destructive" />
            <StatCard value={truckCount} label="Trucks" color="primary" />
            <StatCard value={crewCount} label="Crew" color="success" />
          </div>

          {/* Quick actions */}
          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <QuickAction to="/incidents" icon="🔥" label="Incidents" desc="Manage active fires" />
              <QuickAction to="/fleet" icon="🚒" label="Fleet" desc="Trucks & equipment" />
              <QuickAction to="/time" icon="⏱" label="Time" desc="Shift tracking" />
              <QuickAction to="/expenses" icon="💰" label="Expenses" desc="Receipts & costs" />
              <QuickAction to="/crew" icon="👥" label="Crew" desc="Personnel management" />
            </div>
          </section>

          {/* Recent incidents */}
          <section>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
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
                  <p className="text-3xl mb-2">🔥</p>
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
      </div>
    </AppShell>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-card p-3.5 card-shadow text-center">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 text-${color}`}>{label}</p>
    </div>
  );
}

function QuickAction({ to, icon, label, desc }: { to: string; icon: string; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 rounded-2xl bg-card p-3.5 card-shadow transition-all duration-150 active:scale-[0.98] active:shadow-none"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-lg shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </Link>
  );
}
