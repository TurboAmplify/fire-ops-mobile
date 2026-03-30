import { AppShell } from "@/components/AppShell";
import { Flame, Clock, DollarSign, Truck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";

const quickLinks = [
  { label: "Incidents", icon: Flame, to: "/incidents", desc: "Active fires" },
  { label: "Fleet", icon: Truck, to: "/fleet", desc: "Trucks & equipment" },
  { label: "Time", icon: Clock, to: "/time", desc: "Shift tracking" },
  { label: "Expenses", icon: DollarSign, to: "/expenses", desc: "Receipts & costs" },
];

export default function Dashboard() {
  const { data: incidents } = useIncidents();
  const activeCount = incidents?.filter((i) => i.status === "active").length ?? 0;

  return (
    <AppShell title="FireOps HQ">
      <div className="space-y-5 p-4">
        {/* Hero status card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
          <div className="relative z-10">
            <p className="text-sm font-medium opacity-80">Active Incidents</p>
            <p className="text-4xl font-extrabold tracking-tight mt-1">{activeCount}</p>
            <p className="text-xs font-medium opacity-60 mt-2">
              {activeCount === 0 ? "All clear — no active incidents" : `${activeCount} incident${activeCount > 1 ? "s" : ""} requiring attention`}
            </p>
          </div>
          {/* Decorative circle */}
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 h-20 w-20 rounded-full bg-white/5" />
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
                className="flex items-center gap-3 rounded-2xl bg-card p-3.5 card-shadow transition-all duration-150 active:scale-[0.97] active:shadow-none"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                  <link.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
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
                <Flame className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
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
                      ? "bg-destructive/12 text-destructive"
                      : "bg-success/12 text-success"
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
