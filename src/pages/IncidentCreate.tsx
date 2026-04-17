import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { getLocalDateString } from "@/lib/local-date";
import { useCreateIncident } from "@/hooks/useIncidents";
import { TYPE_LABELS } from "@/services/incidents";
import type { IncidentType } from "@/services/incidents";
import { uploadResourceOrderFile, parseResourceOrderAI } from "@/services/resource-orders";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2, Upload, FileText, PenLine } from "lucide-react";
import { toast } from "sonner";

type Step = "choose" | "parsing" | "form";

export default function IncidentCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateIncident();
  const { membership } = useOrganization();

  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [type, setType] = useState<IncidentType>("wildfire");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [parsedExtras, setParsedExtras] = useState<Record<string, any>>({});
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const canSubmit = name.trim() && location.trim() && !createMutation.isPending;

  const inferType = (parsed: Record<string, any>): IncidentType => {
    const text = `${parsed.incident_name || ""} ${parsed.resource_type || ""} ${parsed.special_instructions || ""}`.toLowerCase();
    if (text.includes("prescribed") || text.includes("rx")) return "prescribed";
    if (text.includes("structure")) return "structure";
    if (text.includes("wildfire") || text.includes("fire")) return "wildfire";
    return "wildfire";
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

      toast.success("Resource order parsed - review and confirm");
      setStep("form");
    } catch {
      toast.error("Failed to parse resource order - fill in manually");
      setStep("form");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const incident = await createMutation.mutateAsync({
        name: name.trim(),
        type,
        status: "active",
        location: location.trim(),
        start_date: parsedExtras.reporting_date || getLocalDateString(),
      });

      // Clean up the orphaned RO file from storage — it was only used for parsing.
      // The user can re-upload and attach it to a specific truck on the incident detail page.
      if (uploadedFileUrl) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          // Extract path after the bucket name in the public URL
          const match = uploadedFileUrl.match(/\/resource-orders\/(.+)$/);
          if (match?.[1]) {
            await supabase.storage.from("resource-orders").remove([match[1]]);
          }
        } catch {
          // Non-fatal — file cleanup is best-effort
        }
      }

      toast.success("Incident created");
      navigate(`/incidents/${incident.id}`);
    } catch {
      toast.error("Failed to create incident");
    }
  };

  return (
    <AppShell
      title="New Incident"
      headerRight={
        <button
          onClick={() => step === "form" && !uploadedFileUrl ? setStep("choose") : navigate(-1)}
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
