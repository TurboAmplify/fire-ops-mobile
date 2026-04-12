import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { Users, Truck, ClipboardList, Settings, ChevronRight } from "lucide-react";

export default function More() {
  const navigate = useNavigate();

  const items = [
    { icon: Users, label: "Crew", to: "/crew" },
    { icon: Truck, label: "Fleet", to: "/fleet" },
    { icon: ClipboardList, label: "Needs List", to: "/needs" },
    { icon: Settings, label: "Settings", to: "/settings" },
  ];

  return (
    <AppShell title="More">
      <div className="p-4">
        <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
          {items.map((item) => (
            <button
              key={item.to}
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
      </div>
    </AppShell>
  );
}
