import { useIncidents } from "@/hooks/useIncidents";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { CATEGORY_LABELS, FUEL_TYPE_LABELS, SCOPE_LABELS, uploadReceipt } from "@/services/expenses";
import type { ExpenseCategory, ExpenseInsert, Expense, FuelType, ExpenseType, AttachmentScope } from "@/services/expenses";
import type { ParsedReceipt } from "@/services/ai-parsing";
import { ReceiptParseButton } from "./ReceiptParseButton";
import { FuelTypeModal } from "./FuelTypeModal";
import { MealComplianceFields } from "./MealComplianceFields";
import { useState } from "react";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

const categories: ExpenseCategory[] = ["fuel", "ppe", "food", "lodging", "equipment", "other"];
const scopes: AttachmentScope[] = ["company", "incident", "truck"];

function deriveScope(initial?: Partial<Expense>): AttachmentScope {
  if (!initial) return "incident";
  if (initial.incident_truck_id) return "truck";
  if (initial.incident_id) return "incident";
  return "company";
}

interface Props {
  initial?: Partial<Expense>;
  onSubmit: (data: ExpenseInsert) => Promise<void>;
  isPending: boolean;
  submitLabel: string;
}

export function ExpenseForm({ initial, onSubmit, isPending, submitLabel }: Props) {
  const { membership } = useOrganization();
  const [scope, setScope] = useState<AttachmentScope>(deriveScope(initial));
  const [incidentId, setIncidentId] = useState(initial?.incident_id ?? "");
  const [incidentTruckId, setIncidentTruckId] = useState(initial?.incident_truck_id ?? "");
  const [category, setCategory] = useState<ExpenseCategory>((initial?.category as ExpenseCategory) ?? "fuel");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split("T")[0]);
  const [receiptUrl, setReceiptUrl] = useState(initial?.receipt_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [expenseType, setExpenseType] = useState<ExpenseType>((initial?.expense_type as ExpenseType) ?? "company");
  const [fuelType, setFuelType] = useState<FuelType | "">(
    (initial?.fuel_type as FuelType) ?? ""
  );
  const [mealAttendees, setMealAttendees] = useState(initial?.meal_attendees ?? "");
  const [mealPurpose, setMealPurpose] = useState(initial?.meal_purpose ?? "");
  const [showFuelModal, setShowFuelModal] = useState(false);

  const { data: incidents } = useIncidents();
  const { data: incidentTrucks } = useIncidentTrucks(incidentId);

  const isMeal = category === "food";
  const isFuel = category === "fuel";
  const mealValid = !isMeal || mealAttendees.trim().length > 0;

  const needsIncident = scope === "incident" || scope === "truck";
  const needsTruck = scope === "truck";

  const incidentValid = !needsIncident || !!incidentId;
  const truckValid = !needsTruck || !!incidentTruckId;

  const canSubmit = amount && parseFloat(amount) > 0 && date && mealValid && incidentValid && truckValid && !isPending && !uploading;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadReceipt(file, membership?.organizationId);
      setReceiptUrl(url);
      toast.success("Receipt uploaded");
    } catch {
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  const handleApplyParsed = (parsed: ParsedReceipt) => {
    if (parsed.amount != null) setAmount(String(parsed.amount));
    if (parsed.date) setDate(parsed.date);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.vendor) setVendor(parsed.vendor);
    if (parsed.category && categories.includes(parsed.category as ExpenseCategory)) {
      const detectedCategory = parsed.category as ExpenseCategory;
      setCategory(detectedCategory);
      if (detectedCategory === "fuel") setShowFuelModal(true);
    }
    toast.success("AI suggestions applied — review before saving");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      incident_id: needsIncident ? incidentId : null,
      incident_truck_id: needsTruck ? incidentTruckId : null,
      category,
      amount: parseFloat(amount),
      description: description.trim() || null,
      date,
      receipt_url: receiptUrl || null,
      expense_type: expenseType,
      fuel_type: isFuel && fuelType ? fuelType : null,
      meal_attendees: isMeal ? mealAttendees.trim() || null : null,
      meal_purpose: isMeal ? mealPurpose.trim() || null : null,
      vendor: vendor.trim() || null,
    } as ExpenseInsert);
  };

  return (
    <>
      <FuelTypeModal
        open={showFuelModal}
        onConfirm={(ft) => { setFuelType(ft); setShowFuelModal(false); }}
        onSkip={() => { setCategory("other"); setFuelType(""); setShowFuelModal(false); }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Expense Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["company", "reimbursement"] as ExpenseType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExpenseType(t)}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-target ${
                  expenseType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t === "company" ? "Company Expense" : "Reimbursement"}
              </button>
            ))}
          </div>
        </div>

        {/* Attachment Scope */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Attached To</label>
          <div className="grid grid-cols-3 gap-2">
            {scopes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setScope(s);
                  if (s === "company") { setIncidentId(""); setIncidentTruckId(""); }
                  if (s === "incident") { setIncidentTruckId(""); }
                }}
                className={`rounded-xl px-2 py-2.5 text-xs font-medium transition-colors touch-target ${
                  scope === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Incident selector */}
        {needsIncident && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Incident *</label>
            <select
              value={incidentId}
              onChange={(e) => { setIncidentId(e.target.value); setIncidentTruckId(""); }}
              className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
            >
              <option value="">Select incident...</option>
              {incidents?.map((inc) => (
                <option key={inc.id} value={inc.id}>{inc.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Truck selector */}
        {needsTruck && incidentId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Truck *</label>
            <select
              value={incidentTruckId}
              onChange={(e) => setIncidentTruckId(e.target.value)}
              className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
            >
              <option value="">Select truck...</option>
              {incidentTrucks?.map((it) => (
                <option key={it.id} value={it.id}>{it.trucks.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Receipt photo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Receipt (optional)</label>
          <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground cursor-pointer active:bg-secondary transition-colors touch-target">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span>{uploading ? "Uploading..." : receiptUrl ? "Change photo" : "Take or attach photo"}</span>
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>
          {receiptUrl && (
            <>
              <img src={receiptUrl} alt="Receipt preview" className="w-full max-h-40 object-contain rounded-lg bg-secondary" />
              <ReceiptParseButton receiptUrl={receiptUrl} onApply={handleApplyParsed} />
            </>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  if (c === "fuel") setShowFuelModal(true);
                  if (c !== "fuel") setFuelType("");
                }}
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

        {/* Fuel type indicator */}
        {isFuel && fuelType && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
            <span className="text-sm text-primary font-medium">
              ⛽ Fuel type: {FUEL_TYPE_LABELS[fuelType as FuelType]}
            </span>
            <button type="button" onClick={() => setShowFuelModal(true)} className="text-xs text-primary font-semibold touch-target">
              Change
            </button>
          </div>
        )}

        {/* Meal compliance */}
        {isMeal && (
          <MealComplianceFields
            attendees={mealAttendees}
            onAttendeesChange={setMealAttendees}
            purpose={mealPurpose}
            onPurposeChange={setMealPurpose}
          />
        )}

        {/* Vendor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Vendor (optional)</label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Shell, Subway"
            className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
          />
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
            placeholder="e.g. Fuel for crew truck during fire response"
            className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
          />
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
    </>
  );
}
