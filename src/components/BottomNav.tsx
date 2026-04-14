import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, MoreHorizontal, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { getSelectedTabs, NAV_STORAGE_KEY } from "@/components/settings/NavBarCustomizer";
import { ShiftTicketQuickAccess } from "@/components/shift-tickets/ShiftTicketQuickAccess";
import type { LucideIcon } from "lucide-react";

interface Tab {
  label: string;
  icon: LucideIcon;
  to: string;
  action?: "shift-tickets";
}

function buildTabs(): Tab[] {
  const userTabs = getSelectedTabs();
  return userTabs.map((t) => {
    if (t.key === "shift-tickets") {
      return { label: t.label, icon: t.icon, to: "#", action: "shift-tickets" as const };
    }
    return { label: t.label, icon: t.icon, to: t.to };
  });
}

export function BottomNav() {
  const [middleTabs, setMiddleTabs] = useState<Tab[]>(buildTabs);
  const [showTickets, setShowTickets] = useState(false);

  const refresh = useCallback(() => setMiddleTabs(buildTabs()), []);

  useEffect(() => {
    window.addEventListener("nav-tabs-changed", refresh);
    window.addEventListener("storage", (e) => {
      if ((e as StorageEvent).key === NAV_STORAGE_KEY) refresh();
    });
    return () => {
      window.removeEventListener("nav-tabs-changed", refresh);
    };
  }, [refresh]);

  const allTabs: (Tab & { fixed?: boolean })[] = [
    { label: "Home", icon: LayoutDashboard, to: "/", fixed: true },
    ...middleTabs,
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 glass safe-area-bottom">
        <div className="flex items-stretch justify-around">
          {allTabs.map((tab, i) => {
            if (tab.action === "shift-tickets") {
              return (
                <button
                  key={`action-${tab.action}`}
                  onClick={() => setShowTickets(true)}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground active:text-foreground transition-all duration-200"
                >
                  <div className="flex items-center justify-center h-7 w-7 rounded-full">
                    <tab.icon className="h-[18px] w-[18px] stroke-[1.75]" />
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/"}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-200 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200 ${
                      isActive ? "bg-primary/15" : ""
                    }`}>
                      <tab.icon className={`h-[18px] w-[18px] transition-all duration-200 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                    </div>
                    <span className={`transition-all duration-200 ${isActive ? "font-semibold" : ""}`}>{tab.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
      <ShiftTicketQuickAccess open={showTickets} onOpenChange={setShowTickets} />
    </>
  );
}
