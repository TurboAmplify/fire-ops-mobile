import { Flame, Tag, CircleDot, Check, X, ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useState } from "react";
import { CATEGORY_LABELS } from "@/services/expenses";
import type { ExpenseCategory, ExpenseStatus } from "@/services/expenses";

export const UNATTACHED_KEY = "__unattached__";

type IncidentBucket = { id: string; name: string; total: number; count: number };

type Props = {
  incidentFilter: string;
  setIncidentFilter: (v: string) => void;
  filter: ExpenseCategory | "all";
  setFilter: (v: ExpenseCategory | "all") => void;
  statusFilter: ExpenseStatus | "all";
  setStatusFilter: (v: ExpenseStatus | "all") => void;
  incidentBuckets: {
    list: IncidentBucket[];
    unattached: { total: number; count: number };
  };
  categories: (ExpenseCategory | "all")[];
  statusFilters: (ExpenseStatus | "all")[];
};

type SheetKind = "incident" | "type" | "status" | null;

export function ExpenseFilterBar({
  incidentFilter,
  setIncidentFilter,
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
  incidentBuckets,
  categories,
  statusFilters,
}: Props) {
  const [open, setOpen] = useState<SheetKind>(null);

  const incidentLabel = (() => {
    if (incidentFilter === "all") return null;
    if (incidentFilter === UNATTACHED_KEY) return "Unattached";
    return incidentBuckets.list.find((i) => i.id === incidentFilter)?.name ?? "Incident";
  })();

  const typeLabel = filter === "all" ? null : CATEGORY_LABELS[filter];
  const statusLabel =
    statusFilter === "all" ? null : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);

  const anyActive = incidentFilter !== "all" || filter !== "all" || statusFilter !== "all";

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        <FilterPill
          icon={<Flame className="h-3.5 w-3.5" strokeWidth={2} />}
          label="Incident"
          activeLabel={incidentLabel}
          onOpen={() => setOpen("incident")}
          onClear={() => setIncidentFilter("all")}
        />
        <FilterPill
          icon={<Tag className="h-3.5 w-3.5" strokeWidth={2} />}
          label="Type"
          activeLabel={typeLabel}
          onOpen={() => setOpen("type")}
          onClear={() => setFilter("all")}
        />
        <FilterPill
          icon={<CircleDot className="h-3.5 w-3.5" strokeWidth={2} />}
          label="Status"
          activeLabel={statusLabel}
          onOpen={() => setOpen("status")}
          onClear={() => setStatusFilter("all")}
        />
        {anyActive && (
          <button
            onClick={() => {
              setIncidentFilter("all");
              setFilter("all");
              setStatusFilter("all");
            }}
            className="shrink-0 flex items-center gap-1 rounded-full px-3 h-9 text-[12px] font-semibold text-muted-foreground active:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Incident sheet */}
      <FilterSheet
        open={open === "incident"}
        onOpenChange={(v) => !v && setOpen(null)}
        title="Filter by Incident"
      >
        <SheetOption
          label="All Incidents"
          selected={incidentFilter === "all"}
          onSelect={() => {
            setIncidentFilter("all");
            setOpen(null);
          }}
        />
        {incidentBuckets.unattached.count > 0 && (
          <SheetOption
            label="Unattached"
            sublabel={`$${incidentBuckets.unattached.total.toFixed(0)} · ${incidentBuckets.unattached.count} item${incidentBuckets.unattached.count === 1 ? "" : "s"}`}
            selected={incidentFilter === UNATTACHED_KEY}
            onSelect={() => {
              setIncidentFilter(UNATTACHED_KEY);
              setOpen(null);
            }}
          />
        )}
        {incidentBuckets.list.map((inc) => (
          <SheetOption
            key={inc.id}
            label={inc.name}
            sublabel={`$${inc.total.toFixed(0)} · ${inc.count} item${inc.count === 1 ? "" : "s"}`}
            selected={incidentFilter === inc.id}
            onSelect={() => {
              setIncidentFilter(inc.id);
              setOpen(null);
            }}
          />
        ))}
      </FilterSheet>

      {/* Type sheet */}
      <FilterSheet
        open={open === "type"}
        onOpenChange={(v) => !v && setOpen(null)}
        title="Filter by Type"
      >
        {categories.map((c) => (
          <SheetOption
            key={c}
            label={c === "all" ? "All Types" : CATEGORY_LABELS[c]}
            selected={filter === c}
            onSelect={() => {
              setFilter(c);
              setOpen(null);
            }}
          />
        ))}
      </FilterSheet>

      {/* Status sheet */}
      <FilterSheet
        open={open === "status"}
        onOpenChange={(v) => !v && setOpen(null)}
        title="Filter by Status"
      >
        {statusFilters.map((s) => (
          <SheetOption
            key={s}
            label={s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            selected={statusFilter === s}
            onSelect={() => {
              setStatusFilter(s);
              setOpen(null);
            }}
          />
        ))}
      </FilterSheet>
    </>
  );
}

function FilterPill({
  icon,
  label,
  activeLabel,
  onOpen,
  onClear,
}: {
  icon: React.ReactNode;
  label: string;
  activeLabel: string | null;
  onOpen: () => void;
  onClear: () => void;
}) {
  const isActive = !!activeLabel;
  return (
    <div
      className={`shrink-0 flex items-center rounded-full h-9 transition-colors ${
        isActive
          ? "bg-foreground text-background"
          : "bg-secondary text-foreground"
      }`}
    >
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 pl-3 pr-2 h-full text-[13px] font-semibold max-w-[160px]"
      >
        <span className={isActive ? "text-background" : "text-muted-foreground"}>{icon}</span>
        <span className="truncate">{activeLabel ?? label}</span>
        {!isActive && <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />}
      </button>
      {isActive && (
        <button
          onClick={onClear}
          aria-label={`Clear ${label.toLowerCase()} filter`}
          className="flex items-center justify-center h-full w-7 pr-2.5 active:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-base">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SheetOption({
  label,
  sublabel,
  selected,
  onSelect,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors active:bg-secondary/60 ${
        selected ? "bg-secondary/40" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sublabel}</p>
        )}
      </div>
      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}
