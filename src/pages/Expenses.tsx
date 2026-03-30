import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, Send } from "lucide-react";
import { useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/services/expenses";
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

  // Count pending reviews for owners
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
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
      }
    >
      <div className="p-4 space-y-4">
        {/* Owner review queue banner */}
        {isOwner && pendingCount > 0 && (
          <Link
            to="/expenses/review"
            className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3 touch-target"
          >
            <span className="text-sm font-semibold text-primary">
              📋 {pendingCount} expense{pendingCount > 1 ? "s" : ""} awaiting review
            </span>
            <span className="text-xs font-medium text-primary">Review →</span>
          </Link>
        )}

        {/* Total banner */}
        <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            {filter === "all" ? "All Expenses" : CATEGORY_LABELS[filter]}
          </span>
          <span className="text-lg font-extrabold text-primary">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors touch-target ${
                filter === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c === "all" ? "All" : `${CATEGORY_ICONS[c]} ${CATEGORY_LABELS[c]}`}
            </button>
          ))}
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors touch-target ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="py-12 text-center text-destructive">Failed to load expenses.</p>
        )}

        {/* List */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">No expenses found.</p>
            )}
            {filtered.map((exp) => (
              <div key={exp.id} className="rounded-xl bg-card overflow-hidden">
                <Link
                  to={`/expenses/${exp.id}`}
                  className="flex items-center justify-between p-4 transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {CATEGORY_ICONS[exp.category as ExpenseCategory] ?? "📦"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          {exp.description || CATEGORY_LABELS[exp.category as ExpenseCategory] || exp.category}
                        </p>
                        <ExpenseStatusBadge status={exp.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {exp.incidents?.name}
                        {exp.incident_trucks?.trucks?.name && ` · ${exp.incident_trucks.trucks.name}`}
                        {exp.expense_type === "reimbursement" && " · Reimbursement"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${Number(exp.amount).toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">{exp.date}</p>
                  </div>
                </Link>
                {/* Quick submit button for drafts */}
                {exp.status === "draft" && (
                  <div className="border-t border-border px-4 py-2">
                    <button
                      onClick={() => handleSubmitExpense(exp.id)}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1 text-xs font-semibold text-primary touch-target"
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
