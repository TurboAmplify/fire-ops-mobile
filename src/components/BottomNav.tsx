import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, MoreHorizontal } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useVisibleSelectedTabs } from "@/components/settings/NavBarCustomizer";
import { ShiftTicketQuickAccess } from "@/components/shift-tickets/ShiftTicketQuickAccess";
import type { LucideIcon } from "lucide-react";

interface Tab {
  label: string;
  icon: LucideIcon;
  to: string;
  action?: "shift-tickets";
}

export function BottomNav() {
  const visibleTabs = useVisibleSelectedTabs();
  const [showTickets, setShowTickets] = useState(false);
  const location = useLocation();
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const refresh = () => setBump((n) => n + 1);
    window.addEventListener("nav-tabs-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nav-tabs-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const middleTabs: Tab[] = useMemo(
    () =>
      visibleTabs.map((t) =>
        t.key === "shift-tickets"
          ? { label: t.label, icon: t.icon, to: "#", action: "shift-tickets" as const }
          : { label: t.label, icon: t.icon, to: t.to },
      ),
    [visibleTabs, location.pathname, bump],
  );

  const allTabs: (Tab & { fixed?: boolean })[] = [
    { label: "Home", icon: LayoutDashboard, to: "/", fixed: true },
    ...middleTabs,
    { label: "More", icon: MoreHorizontal, to: "/more", fixed: true },
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
                key={tab.to + i}
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
