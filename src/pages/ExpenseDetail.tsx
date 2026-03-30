import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate } from "react-router-dom";
import { useExpense, useDeleteExpense, useUpdateExpense } from "@/hooks/useExpenses";
import { CATEGORY_LABELS, CATEGORY_ICONS, FUEL_TYPE_LABELS, STATUS_LABELS } from "@/services/expenses";
import type { ExpenseCategory, FuelType, ExpenseStatus } from "@/services/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { ArrowLeft, Pencil, Trash2, Loader2, Send } from "lucide-react";
import { ReceiptViewer } from "@/components/expenses/ReceiptViewer";
import { toast } from "sonner";
import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading, error } = useExpense(id || "");
  const deleteMutation = useDeleteExpense();
  const updateMutation = useUpdateExpense();
  const { membership } = useOrganization();
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const isOwner = membership?.role === "owner";
  const isOwnExpense = user?.id === expense?.submitted_by_user_id;
  const status = expense?.status as ExpenseStatus;
  const canEdit = isOwnExpense && (status === "draft" || status === "rejected");
  const canDelete = isOwnExpense || isOwner;

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

  const handleSubmit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: expense.id,
        updates: { status: "submitted", submitted_at: new Date().toISOString() },
      });
      toast.success("Expense submitted for review");
    } catch {
      toast.error("Failed to submit");
    }
  };

  const handleReview = async (decision: "approved" | "rejected") => {
    try {
      await updateMutation.mutateAsync({
        id: expense.id,
        updates: {
          status: decision,
          reviewed_by_user_id: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes.trim() || null,
        },
      });
      toast.success(decision === "approved" ? "Expense approved" : "Expense rejected");
      navigate("/expenses");
    } catch {
      toast.error("Failed to update expense");
    }
  };

  const handleMarkReimbursed = async () => {
    try {
      await updateMutation.mutateAsync({
        id: expense.id,
        updates: { status: "reimbursed" },
      });
      toast.success("Marked as reimbursed");
    } catch {
      toast.error("Failed to update");
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
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[cat] ?? expense.category}</p>
                <ExpenseStatusBadge status={expense.status} />
              </div>
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
          {expense.vendor && <InfoRow label="Vendor" value={expense.vendor} />}
          <InfoRow label="Type" value={expense.expense_type === "reimbursement" ? "Reimbursement" : "Company Expense"} />
          {expense.fuel_type && (
            <InfoRow label="Fuel Type" value={FUEL_TYPE_LABELS[expense.fuel_type as FuelType] ?? expense.fuel_type} />
          )}
          {expense.meal_attendees && <InfoRow label="Meal Attendees" value={expense.meal_attendees} />}
          {expense.meal_purpose && <InfoRow label="Meal Purpose" value={expense.meal_purpose} />}
          {expense.review_notes && <InfoRow label="Review Notes" value={expense.review_notes} />}
        </div>

        {/* Receipt */}
        {expense.receipt_url && (
          <ReceiptViewer url={expense.receipt_url} />
        )}

        {/* Submit button for drafts (own only) */}
        {isOwnExpense && status === "draft" && (
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] touch-target flex items-center justify-center gap-2"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Submit for Review
          </button>
        )}

        {/* Owner review actions */}
        {isOwner && status === "submitted" && (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Review This Expense</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Looks good, approved"
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleReview("approved")}
                disabled={updateMutation.isPending}
                className="rounded-xl bg-[hsl(var(--success))] py-3 text-sm font-bold text-[hsl(var(--success-foreground))] touch-target flex items-center justify-center gap-1"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleReview("rejected")}
                disabled={updateMutation.isPending}
                className="rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground touch-target flex items-center justify-center gap-1"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        )}

        {/* Mark reimbursed for approved reimbursements */}
        {isOwner && status === "approved" && expense.expense_type === "reimbursement" && (
          <button
            onClick={handleMarkReimbursed}
            disabled={updateMutation.isPending}
            className="w-full rounded-xl bg-[hsl(var(--success))] py-4 text-base font-bold text-[hsl(var(--success-foreground))] transition-transform active:scale-[0.98] touch-target flex items-center justify-center gap-2"
          >
            💰 Mark as Reimbursed
          </button>
        )}

        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className="flex gap-3">
            {canEdit && (
              <button
                onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground touch-target"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-6 py-3 text-sm font-semibold text-destructive touch-target"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

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
      <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
    </div>
  );
}
