import { LayoutDashboard, Flame, DollarSign, Truck, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { label: "Home", icon: LayoutDashboard, to: "/" },
  { label: "Incidents", icon: Flame, to: "/incidents" },
  { label: "Fleet", icon: Truck, to: "/fleet" },
  { label: "Expenses", icon: DollarSign, to: "/expenses" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 glass safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => (
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
        ))}
      </div>
    </nav>
  );
}
