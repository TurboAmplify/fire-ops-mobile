import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { getLocalDateString } from "@/lib/local-date";
import { useCreateIncident } from "@/hooks/useIncidents";
import { TYPE_LABELS } from "@/services/incidents";
import type { IncidentType } from "@/services/incidents";
import {
  uploadResourceOrderFile,
  parseResourceOrderAI,
  createResourceOrder,
  updateResourceOrderParsed,
  findIncidentTruckForResourceOrder,
  type ExistingResourceOrderMatch,
} from "@/services/resource-orders";
import { useOrganization } from "@/hooks/useOrganization";
import { useAvailableTrucks } from "@/hooks/useIncidentTrucks";
import { assignTruckToIncident } from "@/services/incident-trucks";
import { fuzzyMatchName } from "@/lib/fuzzy-name";
import { Loader2, Upload, FileText, PenLine, Truck as TruckIcon, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Step = "choose" | "parsing" | "form";

export default function IncidentCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateIncident();
  const { membership } = useOrganization();
  const { data: orgTrucks } = useAvailableTrucks(membership?.organizationId ?? undefined);

  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [type, setType] = useState<IncidentType>("wildfire");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [parsedExtras, setParsedExtras] = useState<Record<string, any>>({});
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  // "" = skip / attach later. null = not yet chosen.
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [suggestedTruckId, setSuggestedTruckId] = useState<string | null>(null);
  const [duplicateRO, setDuplicateRO] = useState<ExistingResourceOrderMatch | null>(null);

  const canSubmit =
    name.trim() &&
    location.trim() &&
    !createMutation.isPending &&
    // If an RO was uploaded, force an explicit truck choice (or Skip).
    (uploadedFileUrl ? selectedTruckId !== null : true);

  const inferType = (parsed: Record<string, any>): IncidentType => {
    const text = `${parsed.incident_name || ""} ${parsed.resource_type || ""} ${parsed.special_instructions || ""}`.toLowerCase();
    if (text.includes("prescribed") || text.includes("rx")) return "prescribed";
    if (text.includes("structure")) return "structure";
    if (text.includes("wildfire") || text.includes("fire")) return "wildfire";
    return "wildfire";
  };

  /** Best-effort fuzzy match between parsed RO resource name/type and org trucks. */
  const suggestTruck = (parsed: Record<string, any>): string | null => {
    if (!orgTrucks || orgTrucks.length === 0) return null;
    const candidates: string[] = [];
    if (parsed.resource_name) candidates.push(String(parsed.resource_name));
    if (parsed.resource_order_number) candidates.push(String(parsed.resource_order_number));

    // Try matching by truck name first (e.g. "DL62").
    const truckNames = orgTrucks.map((t) => t.name);
    for (const c of candidates) {
      const m = fuzzyMatchName(c, truckNames, 0.7);
      if (m) {
        const hit = orgTrucks.find((t) => t.name === m.match);
        if (hit) return hit.id;
      }
    }

    // Fallback: if only one truck of the parsed resource_type, pick it.
    if (parsed.resource_type) {
      const wantedType = String(parsed.resource_type).toLowerCase();
      const sameType = orgTrucks.filter((t) =>
        (t.unit_type ?? "").toLowerCase().includes(wantedType) ||
        wantedType.includes((t.unit_type ?? "").toLowerCase()),
      );
      if (sameType.length === 1) return sameType[0].id;
    }

    return null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStep("parsing");
    try {
      const fileUrl = await uploadResourceOrderFile(file, membership?.organizationId);
      setUploadedFileUrl(fileUrl);
      setUploadedFileName(file.name);

      const parsed = await parseResourceOrderAI(fileUrl, file.name);
      setParsedExtras(parsed);

      // Auto-fill form fields from parsed data
      if (parsed.incident_name) setName(parsed.incident_name);
      if (parsed.reporting_location) setLocation(parsed.reporting_location);
      setType(inferType(parsed));

      // Suggest a truck to attach this RO to
      const suggestion = suggestTruck(parsed);
      setSuggestedTruckId(suggestion);
      setSelectedTruckId(suggestion);

      // Duplicate-RO safeguard: warn if this RO# is already on another incident.
      if (parsed.resource_order_number && membership?.organizationId) {
        const dup = await findIncidentTruckForResourceOrder(
          membership.organizationId,
          String(parsed.resource_order_number),
        );
        setDuplicateRO(dup);
      } else {
        setDuplicateRO(null);
      }

      toast.success("Resource order parsed — review and confirm");
      setStep("form");
    } catch {
      toast.error("Failed to parse resource order — fill in manually");
      setStep("form");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (duplicateRO) {
      const ok = window.confirm(
        `Resource Order #${duplicateRO.resource_order_number} is already attached to "${duplicateRO.incident_name}". Create a SECOND incident for the same order anyway?\n\nThis is usually a mistake — tap Cancel to open the existing incident instead.`,
      );
      if (!ok) {
        navigate(`/incidents/${duplicateRO.incident_id}`);
        return;
      }
    }
    try {
      const incident = await createMutation.mutateAsync({
        name: name.trim(),
        type,
        status: "active",
        location: location.trim(),
        start_date: parsedExtras.reporting_date || getLocalDateString(),
      });

      // If an RO was uploaded and a truck chosen, persist the RO against that truck.
      if (uploadedFileUrl && uploadedFileName && selectedTruckId) {
        try {
          const it = await assignTruckToIncident(incident.id, selectedTruckId);
          const ro = await createResourceOrder({
            incident_truck_id: it.id,
            organization_id: membership?.organizationId ?? null,
            file_url: uploadedFileUrl,
            file_name: uploadedFileName,
          });
          if (Object.keys(parsedExtras).length > 0) {
            await updateResourceOrderParsed(ro.id, parsedExtras);
          }
        } catch {
          toast.error("Incident created, but failed to attach Resource Order — re-upload on the truck.");
        }
      } else if (uploadedFileUrl) {
        // User explicitly skipped — clean up the orphaned file.
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const match = uploadedFileUrl.match(/\/resource-orders\/(.+)$/);
          if (match?.[1]) {
            await supabase.storage.from("resource-orders").remove([match[1]]);
          }
        } catch {
          // best-effort
        }
      }

      toast.success("Incident created");
      navigate(`/incidents/${incident.id}`);
    } catch {
      toast.error("Failed to create incident");
    }
  };

  const cleanupOrphanedUpload = async () => {
    if (!uploadedFileUrl) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const match = uploadedFileUrl.match(/\/resource-orders\/(.+)$/);
      if (match?.[1]) {
        await supabase.storage.from("resource-orders").remove([match[1]]);
      }
    } catch {
      // best-effort
    }
  };

  const handleCancel = async () => {
    if (step === "form" && !uploadedFileUrl) {
      setStep("choose");
      return;
    }
    await cleanupOrphanedUpload();
    navigate(-1);
  };

  const suggestedTruck = useMemo(
    () => orgTrucks?.find((t) => t.id === suggestedTruckId) ?? null,
    [orgTrucks, suggestedTruckId],
  );

  return (
    <AppShell
      title="New Incident"
      headerRight={
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          {step === "form" && !uploadedFileUrl ? "Back" : "Cancel"}
        </button>
      }
    >
      {/* Step 1: Choose method */}
      {step === "choose" && (
        <div className="flex flex-col gap-4 p-4 pt-8">
          <p className="text-center text-sm text-muted-foreground">
            How would you like to create this incident?
          </p>

          <label className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 cursor-pointer transition-colors active:bg-primary/10 touch-target">
            <Upload className="h-8 w-8 text-primary" />
            <span className="text-base font-bold text-primary">Upload Resource Order</span>
            <span className="text-xs text-muted-foreground text-center">
              Upload your resource order and we'll fill everything in automatically
            </span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setStep("form")}
            className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-4 text-sm font-medium text-muted-foreground transition-colors active:bg-secondary touch-target"
          >
            <PenLine className="h-4 w-4" />
            Enter Manually
          </button>
        </div>
      )}

      {/* Step 2: Parsing state */}
      {step === "parsing" && (
        <div className="flex flex-col items-center justify-center gap-4 p-8 pt-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Parsing resource order...</p>
          <p className="text-xs text-muted-foreground text-center">
            Extracting incident details from your document
          </p>
        </div>
      )}

      {/* Step 3: Form (auto-filled or manual) */}
      {step === "form" && (
        <form onSubmit={handleSubmit} className="space-y-5 p-4">
          {uploadedFileName && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary font-medium truncate">
                Filled from: {uploadedFileName}
              </p>
            </div>
          )}

          {duplicateRO && (
            <div className="rounded-xl border-2 border-warning bg-warning/10 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-warning">
                    Resource Order #{duplicateRO.resource_order_number} is already in use
                  </p>
                  <p className="text-xs text-foreground/80 mt-1">
                    It's attached to <span className="font-semibold">{duplicateRO.incident_name}</span>.
                    Creating a second incident for the same order is almost always a mistake —
                    shift tickets and emails could end up split across both.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/incidents/${duplicateRO.incident_id}`)}
                className="w-full rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold touch-target"
              >
                Open existing incident
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Incident Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eagle Creek Fire"
              className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
              autoFocus
            />
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Summit County, CO"
              className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
            />
          </div>

          {/* Truck attach picker — only when an RO was uploaded */}
          {uploadedFileUrl && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5">
                <TruckIcon className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Attach Resource Order to truck
                </p>
              </div>
              {suggestedTruck && (
                <p className="flex items-center gap-1 text-[11px] text-primary/80">
                  <Sparkles className="h-3 w-3" />
                  Suggested: <span className="font-semibold">{suggestedTruck.name}</span>
                  {parsedExtras.resource_name && ` (RO says "${parsedExtras.resource_name}")`}
                </p>
              )}
              {!suggestedTruck && parsedExtras.resource_name && (
                <p className="text-[11px] text-muted-foreground">
                  RO resource: <span className="font-medium">{parsedExtras.resource_name}</span>
                </p>
              )}
              <select
                value={selectedTruckId ?? ""}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2.5 text-sm touch-target"
              >
                <option value="">Skip — attach later</option>
                {orgTrucks?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.unit_type ? ` · ${t.unit_type}` : ""}
                  </option>
                ))}
              </select>
              {selectedTruckId === "" && (
                <p className="text-[11px] text-muted-foreground">
                  You can attach the RO to a truck from the incident's Trucks tab after creation.
                </p>
              )}
            </div>
          )}

          {parsedExtras.incident_number && (
            <div className="rounded-lg bg-secondary/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Incident #: <span className="font-medium text-foreground">{parsedExtras.incident_number}</span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploadedFileUrl ? "Confirm & Create" : "Create Incident"}
          </button>
        </form>
      )}
    </AppShell>
  );
}
