import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, Send, DollarSign, ScanLine } from "lucide-react";
import { useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { CATEGORY_LABELS, CATEGORY_ICON_MAP } from "@/services/expenses";
import type { ExpenseCategory, ExpenseStatus } from "@/services/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { useOrganization } from "@/hooks/useOrganization";
import { useState } from "react";
import { toast } from "sonner";

const categories: (ExpenseCategory | "all")[] = ["all", "fuel", "ppe", "food", "lodging", "equipment", "other"];
const statusFilters: (ExpenseStatus | "all")[] = ["all", "draft", "submitted", "approved", "rejected", "reimbursed"];

export default function Expenses() {
  const { data: expenses, isLoading, error } = useExpenses();
  const { membership } = useOrganization();
  const updateMutation = useUpdateExpense();
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const isOwner = membership?.role === "owner";

  const filtered = expenses
    ?.filter((e) => filter === "all" || e.category === filter)
    ?.filter((e) => statusFilter === "all" || e.status === statusFilter)
    ?? [];

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

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

  return (
    <AppShell
      title="Expenses"
      headerRight={
        <Link
          to="/expenses/new"
          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 h-9 text-sm font-semibold text-primary-foreground active:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
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

        {/* Total banner */}
        <div className="rounded-2xl bg-card p-4 card-shadow flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
              <DollarSign className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {filter === "all" ? "Total" : CATEGORY_LABELS[filter]}
            </span>
          </div>
          <span className="text-xl font-extrabold">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
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
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => { const Icon = CATEGORY_ICON_MAP[exp.category as ExpenseCategory] ?? CATEGORY_ICON_MAP.other; return <Icon className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.75} />; })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {exp.description || CATEGORY_LABELS[exp.category as ExpenseCategory] || exp.category}
                        </p>
                        <ExpenseStatusBadge status={exp.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {exp.incidents?.name ?? "Company"}
                        {exp.incident_trucks?.trucks?.name && ` · ${exp.incident_trucks.trucks.name}`}
                        {exp.expense_type === "reimbursement" && " · Reimbursement"}
                      </p>
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
