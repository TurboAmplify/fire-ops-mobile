import { useState, useEffect } from "react";
import {
  Flame, Banknote, DollarSign, FileText, Users, Truck, ClipboardList, Package, GraduationCap, Siren, FileSpreadsheet, Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";
import { useAppMode, type ModuleFlags } from "@/lib/app-mode";
import { useOrganization } from "@/hooks/useOrganization";

export const NAV_STORAGE_KEY = "fireops-nav-tabs";

export interface NavTabOption {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  /** If set, this tab requires the given module to be enabled. */
  module?: keyof ModuleFlags;
  /** If true, only admins see this tab. */
  adminOnly?: boolean;
}

export const ALL_NAV_OPTIONS: NavTabOption[] = [
  { key: "incidents", label: "Incidents", icon: Flame, to: "/incidents" },
  { key: "payroll", label: "Payroll", icon: Banknote, to: "/payroll", module: "payroll", adminOnly: true },
  { key: "expenses", label: "Expenses", icon: DollarSign, to: "/expenses" },
  { key: "shift-tickets", label: "Shift Tickets", icon: FileText, to: "/shift-tickets", module: "shiftTickets" },
  { key: "crew", label: "Crew", icon: Users, to: "/crew" },
  { key: "fleet", label: "Fleet", icon: Truck, to: "/fleet" },
  { key: "needs", label: "Needs List", icon: ClipboardList, to: "/needs" },
  { key: "training", label: "Training", icon: GraduationCap, to: "/training", module: "training" },
  { key: "run-reports", label: "Run Reports", icon: Siren, to: "/run-reports", module: "runReport" },
  { key: "ctr", label: "Crew Time Report", icon: FileSpreadsheet, to: "/ctr", module: "ctr" },
];

export const DEFAULT_TAB_KEYS = ["incidents", "expenses", "shift-tickets", "crew"];

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

/** Filter the master nav list by the active modules + admin role. */
export function filterNavByMode(
  options: NavTabOption[],
  modules: ModuleFlags,
  isAdmin: boolean,
): NavTabOption[] {
  return options.filter((o) => {
    if (o.module && !modules[o.module]) return false;
    if (o.adminOnly && !isAdmin) return false;
    return true;
  });
}

/** Hook: returns the user's chosen nav tabs that are visible under the current mode. */
export function useVisibleSelectedTabs(): NavTabOption[] {
  const { modules } = useAppMode();
  const { isAdmin } = useOrganization();
  const keys = getSelectedTabKeys();
  return keys
    .map((k) => ALL_NAV_OPTIONS.find((o) => o.key === k))
    .filter((o): o is NavTabOption => !!o)
    .filter((o) => {
      if (o.module && !modules[o.module]) return false;
      if (o.adminOnly && !isAdmin) return false;
      return true;
    });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NavBarCustomizer({ open, onOpenChange }: Props) {
  const { modules } = useAppMode();
  const { isAdmin } = useOrganization();
  const availableOptions = filterNavByMode(ALL_NAV_OPTIONS, modules, isAdmin);

  const [selected, setSelected] = useState<string[]>(getSelectedTabKeys);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (open) setSelected(getSelectedTabKeys());
  }, [open]);

  const persist = (next: string[]) => {
    if (next.length < 1 || next.length > 4) return;
    try {
      localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("nav-tabs-changed"));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
    } catch {
      // ignore
    }
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      let next = prev;
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        next = prev.filter((k) => k !== key);
      } else {
        if (prev.length >= 4) return prev;
        next = [...prev, key];
      }
      persist(next);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base">Customize Navigation</DialogTitle>
            <span
              className={`flex items-center gap-1 text-xs font-medium text-success transition-opacity ${
                savedFlash ? "opacity-100" : "opacity-0"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          </div>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-3">
          Choose up to 4 items for your bottom navigation bar. Changes save automatically. Home and More are always visible.
        </p>
        <div className="space-y-2">
          {availableOptions.map((opt) => {
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
      </DialogContent>
    </Dialog>
  );
}
