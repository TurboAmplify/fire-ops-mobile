import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, DollarSign } from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/services/expenses";
import type { ExpenseCategory } from "@/services/expenses";
import { useState } from "react";

const categories: (ExpenseCategory | "all")[] = ["all", "fuel", "ppe", "food", "lodging", "equipment", "other"];

export default function Expenses() {
  const { data: expenses, isLoading, error } = useExpenses();
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");

  const filtered =
    expenses && filter === "all"
      ? expenses
      : expenses?.filter((e) => e.category === filter) ?? [];

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

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
        {/* Total banner */}
        <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            {filter === "all" ? "All Expenses" : CATEGORY_LABELS[filter]}
          </span>
          <span className="text-lg font-extrabold text-primary">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Filter chips */}
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
              <Link
                key={exp.id}
                to={`/expenses/${exp.id}`}
                className="flex items-center justify-between rounded-xl bg-card p-4 transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {CATEGORY_ICONS[exp.category as ExpenseCategory] ?? "📦"}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">
                      {exp.description || CATEGORY_LABELS[exp.category as ExpenseCategory] || exp.category}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {exp.incidents?.name}
                      {exp.incident_trucks?.trucks?.name && ` · ${exp.incident_trucks.trucks.name}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">${Number(exp.amount).toFixed(2)}</p>
                  <p className="text-[11px] text-muted-foreground">{exp.date}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
