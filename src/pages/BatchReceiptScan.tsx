import { AppShell } from "@/components/AppShell";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, CheckCircle2, Trash2, Pencil, Save } from "lucide-react";
import { uploadReceipt, CATEGORY_LABELS } from "@/services/expenses";
import type { ExpenseCategory } from "@/services/expenses";
import { parseBatchReceiptsAI, type ParsedReceipt } from "@/services/ai-parsing";
import { useCreateExpense } from "@/hooks/useExpenses";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type QueueItem = ParsedReceipt & { id: string; status: "pending" | "approved" | "discarded" };

export default function BatchReceiptScan() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { membership } = useOrganization();
  const { user } = useAuth();
  const createMutation = useCreateExpense();

  const [phase, setPhase] = useState<"capture" | "analyzing" | "review" | "saving">("capture");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);

  const pendingItems = queue.filter((q) => q.status === "pending");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase("analyzing");

    try {
      const url = await uploadReceipt(file, membership?.organizationId ?? undefined);
      setReceiptUrl(url);
      const receipts = await parseBatchReceiptsAI(url);
      if (!receipts.length) {
        setError("No receipts detected in the image. Try again with a clearer photo.");
        setPhase("capture");
        return;
      }
      setQueue(
        receipts.map((r, i) => ({
          ...r,
          id: `batch-${Date.now()}-${i}`,
          status: "pending" as const,
        }))
      );
      setPhase("review");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to analyze receipts");
      setPhase("capture");
    }
  };

  const approveItem = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    try {
      await createMutation.mutateAsync({
        amount: item.amount ?? 0,
        category: item.category ?? "other",
        date: item.date ?? new Date().toISOString().slice(0, 10),
        description: item.description ?? "",
        vendor: item.vendor ?? null,
        receipt_url: receiptUrl,
        expense_type: "company",
        status: "draft",
        organization_id: membership?.organizationId ?? null,
        submitted_by_user_id: user?.id ?? null,
      });
      setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "approved" as const } : q)));
      toast.success("Expense saved as draft");
    } catch {
      toast.error("Failed to save expense");
    }
  };

  const discardItem = (id: string) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "discarded" as const } : q)));
    setDiscardTarget(null);
  };

  const editItem = (item: QueueItem) => {
    // Navigate to new expense form pre-filled via state
    navigate("/expenses/new", {
      state: {
        prefill: {
          amount: item.amount,
          category: item.category,
          date: item.date,
          description: item.description,
          vendor: item.vendor,
          receipt_url: receiptUrl,
        },
      },
    });
  };

  const saveAll = async () => {
    setPhase("saving");
    let count = 0;
    for (const item of pendingItems) {
      try {
        await createMutation.mutateAsync({
          amount: item.amount ?? 0,
          category: item.category ?? "other",
          date: item.date ?? new Date().toISOString().slice(0, 10),
          description: item.description ?? "",
          vendor: item.vendor ?? null,
          receipt_url: receiptUrl,
          expense_type: "company",
          status: "draft",
          organization_id: membership?.organizationId ?? null,
          submitted_by_user_id: user?.id ?? null,
        });
        count++;
      } catch {
        // continue with others
      }
    }
    toast.success(`${count} expense${count !== 1 ? "s" : ""} saved as drafts`);
    navigate("/expenses");
  };

  return (
    <AppShell title="Batch Scan" backTo="/expenses">
      <div className="p-4 space-y-4 pb-32">
        {/* Capture phase */}
        {phase === "capture" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <Camera className="h-8 w-8 text-accent-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[260px]">
              Lay out your receipts and take one photo. We will detect and process each one.
            </p>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-full bg-primary px-6 h-12 text-sm font-semibold text-primary-foreground active:bg-primary/90"
            >
              <Camera className="h-5 w-5" />
              Take Photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Analyzing phase */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Analyzing receipts...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </div>
        )}

        {/* Review phase */}
        {(phase === "review" || phase === "saving") && (
          <>
            <p className="text-sm font-medium text-muted-foreground">
              {pendingItems.length} receipt{pendingItems.length !== 1 ? "s" : ""} detected — review and approve
            </p>

            <div className="space-y-3">
              {queue.map((item) => {
                if (item.status === "discarded") return null;
                const isApproved = item.status === "approved";
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-card p-4 card-shadow space-y-2 ${isApproved ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">
                          {item.vendor || item.description || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {CATEGORY_LABELS[(item.category as ExpenseCategory) ?? "other"] ?? "Other"}
                          {item.date ? ` -- ${item.date}` : ""}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <p className="font-bold text-base ml-3 shrink-0">
                        ${(item.amount ?? 0).toFixed(2)}
                      </p>
                    </div>

                    {isApproved ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--success))]">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved as draft
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => approveItem(item.id)}
                          disabled={createMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:bg-primary/90"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => editItem(item)}
                          className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold active:bg-secondary/70"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDiscardTarget(item.id)}
                          className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold active:bg-destructive/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky Save All bar */}
      {phase === "review" && pendingItems.length > 0 && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
          <button
            onClick={saveAll}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold active:bg-primary/90"
          >
            <Save className="h-5 w-5" />
            Save All ({pendingItems.length})
          </button>
        </div>
      )}

      {phase === "saving" && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
          <div className="flex items-center justify-center gap-2 h-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving expenses...
          </div>
        </div>
      )}

      {/* Discard confirmation */}
      <AlertDialog open={!!discardTarget} onOpenChange={() => setDiscardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              This receipt will be removed from the queue. You can always re-scan later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => discardTarget && discardItem(discardTarget)}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
