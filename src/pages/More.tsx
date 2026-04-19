import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, Shield, BarChart3, ClipboardList } from "lucide-react";
import { ALL_NAV_OPTIONS, getSelectedTabKeys, filterNavByMode } from "@/components/settings/NavBarCustomizer";
import { useOrganization } from "@/hooks/useOrganization";
import { useAppMode } from "@/lib/app-mode";
import { useEffect, useState } from "react";

export default function More() {
  const navigate = useNavigate();
  const { isAdmin } = useOrganization();
  const { modules } = useAppMode();
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const handler = () => setBump((n) => n + 1);
    window.addEventListener("nav-tabs-changed", handler);
    return () => window.removeEventListener("nav-tabs-changed", handler);
  }, []);

  // Re-read on every render; bump forces re-render on change
  void bump;
  const selectedKeys = new Set(getSelectedTabKeys());
  const visible = filterNavByMode(ALL_NAV_OPTIONS, modules, isAdmin);
  const nonFavorites = visible.filter((o) => !selectedKeys.has(o.key));

  return (
    <AppShell title="More">
      <div className="p-4 space-y-5">
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Logs
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <button
              onClick={() => navigate("/shift-tickets/log")}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                <ClipboardList className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Shift Ticket Log</p>
                <p className="text-[11px] text-muted-foreground">All tickets, lunch, per diem, signatures</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          </div>
        </section>

        {nonFavorites.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              All Sections
            </h2>
            <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
              {nonFavorites.map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.to)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shrink-0">
                    <item.icon className="h-[18px] w-[18px] text-accent-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Admin
            </h2>
            <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
              <button
                onClick={() => navigate("/admin/logs")}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                  <BarChart3 className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Activity Logs</p>
                  <p className="text-[11px] text-muted-foreground">Inspections, signatures, expenses</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
              <button
                onClick={() => navigate("/settings/organization")}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shrink-0">
                  <Shield className="h-[18px] w-[18px] text-accent-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium">Organization Settings</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Account
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <button
              onClick={() => navigate("/settings")}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shrink-0">
                <Settings className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <span className="flex-1 text-sm font-medium">Settings</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
