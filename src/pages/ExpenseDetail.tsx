import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate } from "react-router-dom";
import { useExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/services/expenses";
import type { ExpenseCategory } from "@/services/expenses";
import { ArrowLeft, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading, error } = useExpense(id || "");
  const deleteMutation = useDeleteExpense();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <AppShell title="">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (error || !expense) {
    return (
      <AppShell title="Expense">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>Expense not found.</p>
          <button onClick={() => navigate("/expenses")} className="mt-4 text-primary font-semibold touch-target">
            Back to Expenses
          </button>
        </div>
      </AppShell>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(expense.id);
      toast.success("Expense deleted");
      navigate("/expenses");
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const cat = expense.category as ExpenseCategory;

  return (
    <AppShell
      title=""
      headerRight={
        <button onClick={() => navigate("/expenses")} className="flex items-center gap-1 text-sm font-medium text-primary touch-target">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      }
    >
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CATEGORY_ICONS[cat] ?? "📦"}</span>
            <div>
              <p className="text-2xl font-extrabold">${Number(expense.amount).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[cat] ?? expense.category}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <InfoRow label="Date" value={expense.date} />
          <InfoRow label="Incident" value={expense.incidents?.name ?? "—"} />
          {expense.incident_trucks?.trucks?.name && (
            <InfoRow label="Truck" value={expense.incident_trucks.trucks.name} />
          )}
          {expense.description && <InfoRow label="Description" value={expense.description} />}
        </div>

        {/* Receipt */}
        {expense.receipt_url && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Receipt</p>
            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border"
            >
              <img
                src={expense.receipt_url}
                alt="Receipt"
                className="w-full max-h-64 object-contain bg-secondary"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="flex items-center gap-1 p-2 text-xs text-primary font-medium">
                <ExternalLink className="h-3 w-3" />
                View full receipt
              </div>
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/expenses/${expense.id}/edit`)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground touch-target"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-6 py-3 text-sm font-semibold text-destructive touch-target"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="rounded-xl bg-destructive/10 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">Delete this expense?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground touch-target flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground touch-target"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
