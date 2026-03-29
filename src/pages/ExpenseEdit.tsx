import { AppShell } from "@/components/AppShell";
import { useNavigate, useParams } from "react-router-dom";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useCreateExpense, useExpense, useUpdateExpense } from "@/hooks/useExpenses";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExpenseInsert, ExpenseUpdate } from "@/services/expenses";

export default function ExpenseEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const { data: existing, isLoading } = useExpense(isNew ? "" : id);
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  const handleSubmit = async (data: ExpenseInsert) => {
    try {
      if (isNew) {
        await createMutation.mutateAsync(data);
        toast.success("Expense added");
      } else {
        const updates: ExpenseUpdate = { ...data };
        await updateMutation.mutateAsync({ id, updates });
        toast.success("Expense updated");
      }
      navigate("/expenses");
    } catch {
      toast.error(isNew ? "Failed to add expense" : "Failed to update expense");
    }
  };

  if (!isNew && isLoading) {
    return (
      <AppShell title="">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title=""
      headerRight={
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
      }
    >
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-extrabold">{isNew ? "Add Expense" : "Edit Expense"}</h2>
        <ExpenseForm
          initial={existing ?? undefined}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          submitLabel={isNew ? "Add Expense" : "Save Changes"}
        />
      </div>
    </AppShell>
  );
}
