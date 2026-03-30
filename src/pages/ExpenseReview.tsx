import { AppShell } from "@/components/AppShell";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/services/expenses";
import type { ExpenseCategory } from "@/services/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";

export default function ExpenseReview() {
  const navigate = useNavigate();
  const { data: expenses, isLoading } = useExpenses();
  const updateMutation = useUpdateExpense();
  const { user } = useAuth();
  const { membership } = useOrganization();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const isOwner = membership?.role === "owner";

  // Guard: only owners can access the review queue
  if (!isOwner) {
    return (
      <AppShell title="">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="font-semibold">Access restricted</p>
          <p className="text-sm mt-1">Only organization owners can review expenses.</p>
          <button onClick={() => navigate("/expenses")} className="mt-4 text-primary font-semibold touch-target">
            Back to Expenses
          </button>
        </div>
      </AppShell>
    );
  }

  const submitted = expenses?.filter((e) => e.status === "submitted") ?? [];

  const handleReview = async (id: string, decision: "approved" | "rejected") => {
    try {
      await updateMutation.mutateAsync({
        id,
        updates: {
          status: decision,
          reviewed_by_user_id: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes[id]?.trim() || null,
        },
      });
      toast.success(decision === "approved" ? "Approved" : "Rejected");
    } catch {
      toast.error("Failed to update");
    }
  };

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
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-extrabold">Review Queue</h2>
        <p className="text-sm text-muted-foreground">
          {submitted.length} expense{submitted.length !== 1 ? "s" : ""} awaiting your review
        </p>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && submitted.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No expenses to review 🎉</p>
        )}

        <div className="space-y-3">
          {submitted.map((exp) => {
            const cat = exp.category as ExpenseCategory;
            return (
              <div key={exp.id} className="rounded-xl bg-card border border-border overflow-hidden">
                {/* Summary row */}
                <Link to={`/expenses/${exp.id}`} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{CATEGORY_ICONS[cat] ?? "📦"}</span>
                    <div>
                      <p className="font-semibold text-sm">
                        {exp.description || CATEGORY_LABELS[cat] || exp.category}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {exp.incidents?.name} · {exp.date}
                        {exp.expense_type === "reimbursement" && " · Reimbursement"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${Number(exp.amount).toFixed(2)}</p>
                    <ExpenseStatusBadge status={exp.status} />
                  </div>
                </Link>

                {/* Receipt thumbnail */}
                {exp.receipt_url && (
                  <div className="px-4 pb-2">
                    <img
                      src={exp.receipt_url}
                      alt="Receipt"
                      className="w-full max-h-32 object-contain rounded-lg bg-secondary"
                    />
                  </div>
                )}

                {/* Quick review */}
                <div className="border-t border-border px-4 py-3 space-y-2">
                  <input
                    type="text"
                    value={reviewNotes[exp.id] ?? ""}
                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [exp.id]: e.target.value }))}
                    placeholder="Notes (optional)"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleReview(exp.id, "approved")}
                      disabled={updateMutation.isPending}
                      className="rounded-xl bg-[hsl(var(--success))] py-2.5 text-sm font-bold text-[hsl(var(--success-foreground))] touch-target"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReview(exp.id, "rejected")}
                      disabled={updateMutation.isPending}
                      className="rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground touch-target"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
