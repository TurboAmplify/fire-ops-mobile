import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { CATEGORY_LABELS, uploadReceipt } from "@/services/expenses";
import type { ExpenseCategory, ExpenseInsert, Expense } from "@/services/expenses";
import { useState } from "react";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

const categories: ExpenseCategory[] = ["fuel", "ppe", "food", "lodging", "equipment", "other"];

interface Props {
  initial?: Partial<Expense>;
  onSubmit: (data: ExpenseInsert) => Promise<void>;
  isPending: boolean;
  submitLabel: string;
}

export function ExpenseForm({ initial, onSubmit, isPending, submitLabel }: Props) {
  const [incidentId, setIncidentId] = useState(initial?.incident_id ?? "");
  const [incidentTruckId, setIncidentTruckId] = useState(initial?.incident_truck_id ?? "");
  const [category, setCategory] = useState<ExpenseCategory>((initial?.category as ExpenseCategory) ?? "fuel");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split("T")[0]);
  const [receiptUrl, setReceiptUrl] = useState(initial?.receipt_url ?? "");
  const [uploading, setUploading] = useState(false);

  const { data: incidents } = useIncidents();
  const { data: incidentTrucks } = useIncidentTrucks(incidentId);

  const canSubmit = incidentId && amount && parseFloat(amount) > 0 && date && !isPending && !uploading;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadReceipt(file);
      setReceiptUrl(url);
      toast.success("Receipt uploaded");
    } catch {
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      incident_id: incidentId,
      incident_truck_id: incidentTruckId || null,
      category,
      amount: parseFloat(amount),
      description: description.trim() || null,
      date,
      receipt_url: receiptUrl || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Incident selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Incident *</label>
        <select
          value={incidentId}
          onChange={(e) => {
            setIncidentId(e.target.value);
            setIncidentTruckId("");
          }}
          className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
        >
          <option value="">Select incident...</option>
          {incidents?.map((inc) => (
            <option key={inc.id} value={inc.id}>
              {inc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Truck selector (optional, filtered by incident) */}
      {incidentId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Truck (optional)</label>
          <select
            value={incidentTruckId}
            onChange={(e) => setIncidentTruckId(e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
          >
            <option value="">No truck</option>
            {incidentTrucks?.map((it) => (
              <option key={it.id} value={it.id}>
                {it.trucks.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-target ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Amount *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border bg-card pl-8 pr-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
          />
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Date *</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Fuel fill at Shell station"
          className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
        />
      </div>

      {/* Receipt photo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Receipt (optional)</label>
        <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground cursor-pointer active:bg-secondary transition-colors touch-target">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <span>{uploading ? "Uploading..." : receiptUrl ? "Change photo" : "Take or attach photo"}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
        </label>
        {receiptUrl && (
          <img
            src={receiptUrl}
            alt="Receipt preview"
            className="w-full max-h-40 object-contain rounded-lg bg-secondary"
          />
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
