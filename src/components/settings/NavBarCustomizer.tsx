import { useState, useEffect } from "react";
import {
  Flame, Banknote, DollarSign, FileText, Users, Truck, Clock, ClipboardList,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";

export const NAV_STORAGE_KEY = "fireops-nav-tabs";

export interface NavTabOption {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
}

export const ALL_NAV_OPTIONS: NavTabOption[] = [
  { key: "incidents", label: "Incidents", icon: Flame, to: "/incidents" },
  { key: "payroll", label: "Payroll", icon: Banknote, to: "/payroll" },
  { key: "expenses", label: "Expenses", icon: DollarSign, to: "/expenses" },
  { key: "shift-tickets", label: "Shift Tickets", icon: FileText, to: "/shift-tickets" },
  { key: "crew", label: "Crew", icon: Users, to: "/crew" },
  { key: "fleet", label: "Fleet", icon: Truck, to: "/fleet" },
  { key: "time", label: "Time", icon: Clock, to: "/time" },
  { key: "needs", label: "Needs List", icon: ClipboardList, to: "/needs" },
];

export const DEFAULT_TAB_KEYS = ["incidents", "payroll", "expenses", "shift-tickets"];

export function getSelectedTabKeys(): string[] {
  try {
    const stored = localStorage.getItem(NAV_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length >= 1 && parsed.length <= 4) return parsed;
    }
  } catch {}
  return DEFAULT_TAB_KEYS;
}

export function getSelectedTabs(): NavTabOption[] {
  const keys = getSelectedTabKeys();
  return keys.map((k) => ALL_NAV_OPTIONS.find((o) => o.key === k)!).filter(Boolean);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NavBarCustomizer({ open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<string[]>(getSelectedTabKeys);

  useEffect(() => {
    if (open) setSelected(getSelectedTabKeys());
  }, [open]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= 4) return prev; // max 4
      return [...prev, key];
    });
  };

  const handleSave = () => {
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(selected));
    window.dispatchEvent(new Event("nav-tabs-changed"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Customize Navigation</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-3">
          Choose up to 4 items for your bottom navigation bar. Home is always visible.
        </p>
        <div className="space-y-2">
          {ALL_NAV_OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.key);
            const atMax = selected.length >= 4 && !isSelected;
            return (
              <button
                key={opt.key}
                onClick={() => toggle(opt.key)}
                disabled={atMax}
                className={`flex w-full items-center gap-3 rounded-xl p-3.5 border text-left transition-all touch-target ${
                  isSelected
                    ? "bg-primary/10 border-primary/40"
                    : atMax
                    ? "bg-muted/30 border-border/20 opacity-40"
                    : "bg-card border-border/20 active:scale-[0.98]"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                  isSelected ? "bg-primary/20" : "bg-accent"
                }`}>
                  <opt.icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-accent-foreground"}`} />
                </div>
                <span className={`flex-1 text-sm ${isSelected ? "font-semibold" : ""}`}>{opt.label}</span>
                {isSelected && (
                  <span className="text-xs font-bold text-primary">{selected.indexOf(opt.key) + 1}</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={selected.length < 1 || selected.length > 4}
          className="w-full mt-4 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40 touch-target transition-all active:scale-[0.98]"
        >
          Save
        </button>
      </DialogContent>
    </Dialog>
  );
}
