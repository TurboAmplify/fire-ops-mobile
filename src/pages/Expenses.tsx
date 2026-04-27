import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, Send, DollarSign, ScanLine, Flame, Truck as TruckIcon, X } from "lucide-react";
import { useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { CATEGORY_LABELS, CATEGORY_ICON_MAP } from "@/services/expenses";
import type { ExpenseCategory, ExpenseStatus } from "@/services/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { useOrganization } from "@/hooks/useOrganization";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories: (ExpenseCategory | "all")[] = ["all", "fuel", "ppe", "food", "lodging", "equipment", "other"];
const statusFilters: (ExpenseStatus | "all")[] = ["all", "draft", "submitted", "approved", "rejected", "reimbursed"];

const UNATTACHED_KEY = "__unattached__";

export default function Expenses() {
  const { data: expenses, isLoading, error } = useExpenses();
  const { membership } = useOrganization();
  const updateMutation = useUpdateExpense();
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  // Incident filter: "all", "__unattached__", or an incident id
  const [incidentFilter, setIncidentFilter] = useState<string>("all");
  const isOwner = membership?.role === "owner";

  // Build the list of incidents that have at least one expense (with running totals)
  const incidentBuckets = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; count: number }>();
    let unattachedTotal = 0;
    let unattachedCount = 0;
    for (const e of expenses ?? []) {
      if (e.incident_id && e.incidents) {
        const cur = map.get(e.incident_id) ?? { id: e.incident_id, name: e.incidents.name, total: 0, count: 0 };
        cur.total += Number(e.amount);
        cur.count += 1;
        map.set(e.incident_id, cur);
      } else {
        unattachedTotal += Number(e.amount);
        unattachedCount += 1;
      }
    }
    return {
      list: Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)),
      unattached: { total: unattachedTotal, count: unattachedCount },
    };
  }, [expenses]);

  const filtered = (expenses ?? [])
    .filter((e) => filter === "all" || e.category === filter)
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) => {
      if (incidentFilter === "all") return true;
      if (incidentFilter === UNATTACHED_KEY) return !e.incident_id;
      return e.incident_id === incidentFilter;
    });

  const filteredTotal = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const grandTotal = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  const pendingCount = isOwner
    ? expenses?.filter((e) => e.status === "submitted").length ?? 0
    : 0;

  const handleSubmitExpense = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        updates: { status: "submitted", submitted_at: new Date().toISOString() },
      });
      toast.success("Expense submitted for review");
    } catch {
      toast.error("Failed to submit");
    }
  };

  // Header label for the total card
  const totalLabel = (() => {
    if (incidentFilter === UNATTACHED_KEY) return "Unattached";
    if (incidentFilter !== "all") {
      const inc = incidentBuckets.list.find((i) => i.id === incidentFilter);
      return inc?.name ?? "Incident";
    }
    if (filter !== "all") return CATEGORY_LABELS[filter];
    return "Total";
  })();

  return (
    <AppShell
      title="Expenses"
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            to="/expenses/batch-scan"
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 h-9 text-sm font-semibold text-secondary-foreground active:bg-secondary/70"
          >
            <ScanLine className="h-4 w-4" />
            Scan
          </Link>
          <Link
            to="/expenses/new"
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 h-9 text-sm font-semibold text-primary-foreground active:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
      }
    >
      <div className="p-4 space-y-3">
        {/* Owner review queue banner */}
        {isOwner && pendingCount > 0 && (
          <Link
            to="/expenses/review"
            className="flex items-center justify-between rounded-2xl bg-accent p-3.5 active:bg-accent/80"
          >
            <span className="text-sm font-semibold text-accent-foreground">
              {pendingCount} expense{pendingCount > 1 ? "s" : ""} awaiting review
            </span>
            <span className="text-xs font-semibold text-primary">Review →</span>
          </Link>
        )}

        {/* Total banner — current filter total + grand total */}
        <div className="rounded-2xl bg-card p-4 card-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shrink-0">
                <DollarSign className="h-4.5 w-4.5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground truncate">{totalLabel}</span>
            </div>
            <span className="text-xl font-extrabold shrink-0 ml-3">
              ${filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {incidentFilter !== "all" || filter !== "all" || statusFilter !== "all" ? (
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Grand total</span>
              <span className="font-semibold">
                ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ) : null}
        </div>

        {/* Incident filter chips */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">Incident</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setIncidentFilter("all")}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                incidentFilter === "all"
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground active:bg-secondary/70"
              }`}
            >
              All
            </button>
            {incidentBuckets.unattached.count > 0 && (
              <button
                onClick={() => setIncidentFilter(UNATTACHED_KEY)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  incidentFilter === UNATTACHED_KEY
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary text-muted-foreground active:bg-secondary/70"
                }`}
              >
                Unattached · ${incidentBuckets.unattached.total.toFixed(0)}
              </button>
            )}
            {incidentBuckets.list.map((inc) => (
              <button
                key={inc.id}
                onClick={() => setIncidentFilter(inc.id)}
                className={`whitespace-nowrap flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  incidentFilter === inc.id
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary text-muted-foreground active:bg-secondary/70"
                }`}
              >
                <Flame className="h-3 w-3" strokeWidth={2} />
                {inc.name} · ${inc.total.toFixed(0)}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                filter === c
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground active:bg-secondary/70"
              }`}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Status filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-150 ${
                statusFilter === s
                  ? "bg-foreground/80 text-background"
                  : "bg-secondary/70 text-muted-foreground active:bg-secondary"
              }`}
            >
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="py-16 text-center text-destructive text-sm">Failed to load expenses.</p>
        )}

        {/* List */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No expenses found.</p>
              </div>
            )}
            {filtered.map((exp) => (
              <div key={exp.id} className="rounded-2xl bg-card overflow-hidden card-shadow">
                <Link
                  to={`/expenses/${exp.id}`}
                  className="flex items-center justify-between p-4 transition-all duration-150 active:bg-secondary/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {(() => { const Icon = CATEGORY_ICON_MAP[exp.category as ExpenseCategory] ?? CATEGORY_ICON_MAP.other; return <Icon className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.75} />; })()}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {exp.description || CATEGORY_LABELS[exp.category as ExpenseCategory] || exp.category}
                        </p>
                        <ExpenseStatusBadge status={exp.status} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {exp.incidents ? (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Flame className="h-3 w-3 shrink-0" strokeWidth={2} />
                            <span className="truncate">{exp.incidents.name}</span>
                          </span>
                        ) : (
                          <span className="truncate">Unattached</span>
                        )}
                        {exp.incident_trucks?.trucks?.name && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <span>·</span>
                            <TruckIcon className="h-3 w-3 shrink-0" strokeWidth={2} />
                            <span className="truncate">{exp.incident_trucks.trucks.name}</span>
                          </span>
                        )}
                        {exp.expense_type === "reimbursement" && <span>· Reimb.</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-bold text-sm">${Number(exp.amount).toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">{exp.date}</p>
                  </div>
                </Link>
                {/* Quick submit button for drafts */}
                {exp.status === "draft" && (
                  <div className="border-t border-border/60 px-4 py-2.5">
                    <button
                      onClick={() => handleSubmitExpense(exp.id)}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary active:text-primary/70"
                    >
                      <Send className="h-3 w-3" />
                      Submit for Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
