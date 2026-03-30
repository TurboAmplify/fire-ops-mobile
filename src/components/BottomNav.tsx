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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors touch-target ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`
            }
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
