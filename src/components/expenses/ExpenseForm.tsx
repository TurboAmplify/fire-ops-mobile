import { useIncidents } from "@/hooks/useIncidents";
import { getLocalDateString } from "@/lib/local-date";
import { useIncidentTrucks } from "@/hooks/useIncidentTrucks";
import { CATEGORY_LABELS, FUEL_TYPE_LABELS, SCOPE_LABELS, uploadReceipt, compressImageForReceipt, blobToDataUrl } from "@/services/expenses";
import type { ExpenseCategory, ExpenseInsert, Expense, FuelType, ExpenseType, AttachmentScope } from "@/services/expenses";
import type { ParsedReceipt } from "@/services/ai-parsing";
import { parseReceiptAI } from "@/services/ai-parsing";
import { FuelTypeModal } from "./FuelTypeModal";
import { MealComplianceFields } from "./MealComplianceFields";
import { IncidentAttachSheet } from "./IncidentAttachSheet";
import { useState } from "react";
import { Loader2, Camera, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { SignedImage } from "@/components/ui/SignedImage";

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
  const [date, setDate] = useState(initial?.date ?? getLocalDateString());
  const [receiptUrl, setReceiptUrl] = useState(initial?.receipt_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseStep, setParseStep] = useState<"reading" | "extracting">("reading");
  const [localThumb, setLocalThumb] = useState<string | null>(null);
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [expenseType, setExpenseType] = useState<ExpenseType>((initial?.expense_type as ExpenseType) ?? "company");
  const [fuelType, setFuelType] = useState<FuelType | "">(
    (initial?.fuel_type as FuelType) ?? ""
  );
  const [mealAttendees, setMealAttendees] = useState(initial?.meal_attendees ?? "");
  const [mealPurpose, setMealPurpose] = useState(initial?.meal_purpose ?? "");
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [aiParsed, setAiParsed] = useState(false);
  const isEditing = !!initial?.id;

  const { data: incidents } = useIncidents();
  const { data: incidentTrucks } = useIncidentTrucks(incidentId);

  const isMeal = category === "food";
  const isFuel = category === "fuel";

  const needsIncident = scope === "incident" || scope === "truck";
  const needsTruck = scope === "truck";

  const incidentValid = !needsIncident || !!incidentId;
  const truckValid = !needsTruck || !!incidentTruckId;

  // Only the basics block save. Meal attendees is encouraged but not required —
  // we don't want a silently-disabled button stopping a quick field entry.
  const amountValid = !!amount && parseFloat(amount) > 0;
  const canSubmit = amountValid && !!date && incidentValid && truckValid && !isPending && !uploading && !parsing;

  const disabledReason = !amountValid
    ? "Enter an amount"
    : !date
    ? "Pick a date"
    : !incidentValid
    ? "Select an incident"
    : !truckValid
    ? "Select a truck"
    : null;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediately show local thumbnail
    const thumb = URL.createObjectURL(file);
    setLocalThumb(thumb);

    setUploading(true);
    setParsing(true);
    setParseStep("reading");

    try {
      // Compress on client
      const compressed = await compressImageForReceipt(file);
      // Convert to base64 for inline AI call
      const dataUrl = await blobToDataUrl(compressed);
      setParseStep("extracting");

      // Run upload + AI parse in parallel
      const [url, parsed] = await Promise.all([
        uploadReceipt(compressed, membership?.organizationId, file.name),
        parseReceiptAI({ imageDataUrl: dataUrl }).catch(() => null),
      ]);

      setReceiptUrl(url);
      setUploading(false);

      if (parsed) {
        applyParsedData(parsed);
        if (!isEditing && !incidentId) setShowAttachSheet(true);
      } else {
        toast.error("Could not analyze receipt - fill in manually");
      }
    } catch {
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
      setParsing(false);
      // Revoke thumbnail after a short delay so it stays visible while signed URL loads
      setTimeout(() => { URL.revokeObjectURL(thumb); setLocalThumb(null); }, 2000);
    }
  };

  const applyParsedData = (parsed: ParsedReceipt) => {
    if (parsed.amount != null) setAmount(String(parsed.amount));
    if (parsed.date) setDate(parsed.date);
    if (parsed.vendor) setVendor(parsed.vendor);

    if (parsed.category && categories.includes(parsed.category as ExpenseCategory)) {
      const detectedCategory = parsed.category as ExpenseCategory;
      setCategory(detectedCategory);
      setDescription(CATEGORY_LABELS[detectedCategory]);
      setAiParsed(true);

      if (detectedCategory === "fuel") {
        setShowFuelModal(true);
      }
    } else {
      if (parsed.category) {
        setDescription(parsed.category);
      }
      setAiParsed(true);
    }

    toast.success("Receipt analyzed - review before saving");
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

  const previewSrc = localThumb || (receiptUrl && !parsing ? receiptUrl : null);

  return (
    <>
      <FuelTypeModal
        open={showFuelModal}
        onConfirm={(ft) => { setFuelType(ft); setShowFuelModal(false); }}
        onSkip={() => { setCategory("other"); setFuelType(""); setShowFuelModal(false); }}
      />

      <IncidentAttachSheet
        open={showAttachSheet}
        onOpenChange={setShowAttachSheet}
        onConfirm={({ incidentId: incId, incidentTruckId: itId }) => {
          if (itId) {
            setScope("truck");
            setIncidentId(incId ?? "");
            setIncidentTruckId(itId);
          } else if (incId) {
            setScope("incident");
            setIncidentId(incId);
            setIncidentTruckId("");
          } else {
            setScope("company");
            setIncidentId("");
            setIncidentTruckId("");
          }
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Receipt photo — FIRST, photo-first flow */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Receipt Photo</label>
          <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-4 text-sm text-muted-foreground cursor-pointer active:bg-secondary transition-colors touch-target">
            {uploading || parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span className="font-medium">
              {uploading && !parsing
                ? "Uploading..."
                : parsing
                ? parseStep === "reading"
                  ? "Reading receipt..."
                  : "Extracting details..."
                : receiptUrl
                ? "Change photo"
                : "Take or attach receipt photo"}
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
          {previewSrc && (
            localThumb ? (
              <img src={previewSrc} alt="Receipt preview" className="w-full max-h-40 object-contain rounded-lg bg-secondary" />
            ) : (
              <SignedImage src={previewSrc} alt="Receipt preview" className="w-full max-h-40 object-contain rounded-lg bg-secondary" />
            )
          )}
          {parsing && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 p-3">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                {parseStep === "reading" ? "Reading receipt..." : "Extracting details..."}
              </span>
            </div>
          )}
        </div>

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

        {/* Category — always a dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => {
                const c = e.target.value as ExpenseCategory;
                setCategory(c);
                setDescription(CATEGORY_LABELS[c]);
                if (c === "fuel") {
                  setShowFuelModal(true);
                } else {
                  setFuelType("");
                }
              }}
              className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target appearance-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Fuel type indicator */}
        {isFuel && fuelType && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
            <span className="text-sm text-primary font-medium">
              Fuel type: {FUEL_TYPE_LABELS[fuelType as FuelType]}
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
            placeholder="e.g. Fuel"
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
