import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { getLocalDateString } from "@/lib/local-date";
import { Upload, Loader2, FileText, Check, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadAgreementForParsing, parseAgreementAI } from "@/services/agreement-parsing";
import type { ParsedAgreement } from "@/services/agreement-parsing";
import { useCreateIncident } from "@/hooks/useIncidents";
import { useAvailableTrucks, useAssignTruck } from "@/hooks/useIncidentTrucks";
import { useCreateAgreement } from "@/hooks/useAgreements";
import { TYPE_LABELS } from "@/services/incidents";
import type { IncidentType } from "@/services/incidents";
import { useOrganization } from "@/hooks/useOrganization";

type Step = "upload" | "parsing" | "review";

export default function IncidentFromAgreement() {
  const navigate = useNavigate();
  const { membership } = useOrganization();
  const [step, setStep] = useState<Step>("upload");
  const [fileInfo, setFileInfo] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const [parsed, setParsed] = useState<ParsedAgreement>({});
  const [parseError, setParseError] = useState<string | null>(null);

  // Review form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<IncidentType>("wildfire");
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [agreementNumber, setAgreementNumber] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState("");

  const createIncident = useCreateIncident();
  const { data: trucks } = useAvailableTrucks(membership?.organizationId);
  const createAgreement = useCreateAgreement({});
  const [saving, setSaving] = useState(false);

  const matchedTruck = trucks?.find(
    (t) => parsed.truck_name && t.name.toLowerCase().includes(parsed.truck_name.toLowerCase())
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep("parsing");
    setParseError(null);
    try {
      const info = await uploadAgreementForParsing(file, membership?.organizationId);
      setFileInfo(info);
      const result = await parseAgreementAI(info.fileUrl, info.fileName);
      setParsed(result);
      if (result.incident_name) setName(result.incident_name);
      if (result.incident_location) setLocation(result.incident_location);
      if (result.incident_type && result.incident_type in TYPE_LABELS) {
        setType(result.incident_type as IncidentType);
      }
      if (result.start_date) setStartDate(result.start_date);
      if (result.agreement_number) setAgreementNumber(result.agreement_number);
      if (result.truck_name) {
        const match = trucks?.find(
          (t) => t.name.toLowerCase().includes(result.truck_name!.toLowerCase())
        );
        if (match) setSelectedTruckId(match.id);
      }
      setStep("review");
    } catch (err: any) {
      setParseError(err?.message || "Failed to parse agreement");
      setStep("upload");
      toast.error("Failed to parse agreement");
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !location.trim()) {
      toast.error("Name and location are required");
      return;
    }
    setSaving(true);
    try {
      // 1. Create incident
      const incident = await createIncident.mutateAsync({
        name: name.trim(),
        type,
        status: "active",
        location: location.trim(),
        start_date: startDate,
      });

      // 2. Assign truck if selected (use service so we get the id back AND invalidate cache)
      let incidentTruckId: string | null = null;
      if (selectedTruckId) {
        const { assignTruckToIncident } = await import("@/services/incident-trucks");
        const { queryClient } = await import("@/lib/query-client");
        const newIt = await assignTruckToIncident(incident.id, selectedTruckId);
        incidentTruckId = newIt.id;
        queryClient.invalidateQueries({ queryKey: ["incident-trucks", incident.id] });
      }

      // 3. Create agreement record
      if (fileInfo) {
        await createAgreement.mutateAsync({
          incident_id: incident.id,
          incident_truck_id: incidentTruckId,
          file_url: fileInfo.fileUrl,
          file_name: fileInfo.fileName,
          agreement_number: agreementNumber || null,
        });
      }

      toast.success("Incident created from agreement");
      navigate(`/incidents/${incident.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create incident");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="From Agreement"
      headerRight={
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary touch-target">
          Cancel
        </button>
      }
    >
      <div className="p-4 space-y-5">
        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-card p-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Upload Agreement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an agreement or resource order document. AI will extract incident details automatically.
                </p>
              </div>
              <label className="block w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground cursor-pointer touch-target text-center">
                Choose File
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>
            {parseError && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{parseError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Parsing */}
        {step === "parsing" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Analyzing agreement document…</p>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-5">
            {fileInfo && (
              <div className="flex items-center gap-2 rounded-xl bg-card p-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm truncate">{fileInfo.fileName}</p>
                <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
              </div>
            )}

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Review & Confirm
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Incident Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                placeholder="e.g. Eagle Creek Fire"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TYPE_LABELS) as [IncidentType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors touch-target ${
                      type === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Location *</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                placeholder="e.g. Summit County, CO"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Agreement Number</label>
              <input
                value={agreementNumber}
                onChange={(e) => setAgreementNumber(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
                placeholder="e.g. AG-1234"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Assign Truck
                {parsed.truck_name && (
                  <span className="ml-1 text-primary text-xs">(detected: {parsed.truck_name})</span>
                )}
              </label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              >
                <option value="">None</option>
                {trucks?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {matchedTruck?.id === t.id ? " ✓ detected" : ""}
                  </option>
                ))}
              </select>
            </div>

            {(parsed.resource_order_number || parsed.reporting_location || parsed.special_instructions) && (
              <div className="rounded-xl bg-card p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Additional Parsed Data
                </p>
                {parsed.resource_order_number && (
                  <DataRow label="Resource Order #" value={parsed.resource_order_number} />
                )}
                {parsed.reporting_location && (
                  <DataRow label="Report Location" value={parsed.reporting_location} />
                )}
                {parsed.shift_start_time && (
                  <DataRow label="Shift Start" value={parsed.shift_start_time} />
                )}
                {parsed.shift_end_time && (
                  <DataRow label="Shift End" value={parsed.shift_end_time} />
                )}
                {parsed.special_instructions && (
                  <DataRow label="Instructions" value={parsed.special_instructions} />
                )}
                {parsed.additional_data &&
                  Object.entries(parsed.additional_data).map(([k, v]) => (
                    <DataRow key={k} label={k} value={v} />
                  ))}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !location.trim()}
              className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Incident
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
