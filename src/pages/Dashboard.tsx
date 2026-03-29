import { AppShell } from "@/components/AppShell";
import { Flame, Clock, DollarSign, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";

const quickLinks = [
  { label: "Incidents", icon: Flame, to: "/incidents", color: "bg-primary text-primary-foreground" },
  { label: "Time", icon: Clock, to: "/time", color: "bg-secondary text-secondary-foreground" },
  { label: "Expenses", icon: DollarSign, to: "/expenses", color: "bg-secondary text-secondary-foreground" },
  { label: "Settings", icon: Settings, to: "/settings", color: "bg-secondary text-secondary-foreground" },
];

export default function Dashboard() {
  const { data: incidents } = useIncidents();
  const activeCount = incidents?.filter((i) => i.status === "active").length ?? 0;

  return (
    <AppShell title="FireOps HQ">
      <div className="space-y-6 p-4">
        {/* Status banner */}
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <p className="text-sm font-medium opacity-90">Active Incidents</p>
          <p className="text-3xl font-extrabold">{activeCount}</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 rounded-xl p-4 font-semibold transition-transform active:scale-[0.97] ${link.color}`}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Recent incidents */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Incidents
          </h2>
          <div className="space-y-2">
            {(!incidents || incidents.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">No incidents yet.</p>
            )}
            {incidents?.slice(0, 3).map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="flex items-center justify-between rounded-xl bg-card p-4 transition-transform active:scale-[0.98]"
              >
                <div>
                  <p className="font-semibold">{inc.name}</p>
                  <p className="text-sm text-muted-foreground">{inc.location}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
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
