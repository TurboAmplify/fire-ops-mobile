import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, Shield, BarChart3, ClipboardList, ShieldCheck, FileBarChart, CircleDollarSign, Mail, IdCard, Receipt } from "lucide-react";
import { useUnreadTotal } from "@/hooks/useThreads";
import { ALL_NAV_OPTIONS, getSelectedTabKeys, filterNavByMode } from "@/components/settings/NavBarCustomizer";
import { useOrganization } from "@/hooks/useOrganization";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAppMode } from "@/lib/app-mode";
import { useRedCardsEnabled } from "@/hooks/useRedCards";
import { useFactoringEnabled } from "@/hooks/useFactoring";
import { useEffect, useState } from "react";

export default function More() {
  const navigate = useNavigate();
  const { isAdmin, isEngineBoss } = useOrganization();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { modules } = useAppMode();
  const redCardsEnabled = useRedCardsEnabled();
  const { data: factoringEnabled } = useFactoringEnabled();
  const { data: unread } = useUnreadTotal();
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
        {isPlatformAdmin && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Platform
            </h2>
            <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
              <button
                onClick={() => navigate("/super-admin")}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                  <ShieldCheck className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Super Admin</p>
                  <p className="text-[11px] text-muted-foreground">Orgs, users, activity across the platform</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </div>
          </section>
        )}


        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Communication
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <button
              onClick={() => navigate("/messages")}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                <Mail className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Messages</p>
                <p className="text-[11px] text-muted-foreground">Replies from finance officers, demob, OF-286</p>
              </div>
              {unread && unread > 0 ? (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 mr-1">
                  {unread}
                </span>
              ) : null}
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

        {isEngineBoss && !isAdmin && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Operations
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
        )}

        {isAdmin && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Admin
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
              <button
                onClick={() => navigate("/admin/reports")}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                  <FileBarChart className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Reports</p>
                  <p className="text-[11px] text-muted-foreground">PDF / Excel / CSV exports for payroll, activity, audit</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
              <button
                onClick={() => navigate("/admin/accounts-payable")}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                  <CircleDollarSign className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Accounts Payable</p>
                  <p className="text-[11px] text-muted-foreground">Approved crew reimbursements owed</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
              {factoringEnabled && (
                <button
                  onClick={() => navigate("/factoring")}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                    <Receipt className="h-[18px] w-[18px] text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Factoring</p>
                    <p className="text-[11px] text-muted-foreground">Submitted, advanced, reserve held by incident</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              )}
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
            {redCardsEnabled && (
              <button
                onClick={() => navigate("/my-red-card")}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                  <IdCard className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">My Red Card</p>
                  <p className="text-[11px] text-muted-foreground">Your Incident Qualification Card</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
            )}
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

        {/* Build stamp — lets you verify on-device whether the latest published
            build is actually loaded (vs. a cached older one). */}
        <p className="text-center text-[11px] text-muted-foreground/70 pt-2">
          Build v2026.05.18
        </p>
      </div>
    </AppShell>
  );
}
