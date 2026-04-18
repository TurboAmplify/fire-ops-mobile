import { AppShell } from "@/components/AppShell";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useIncident, useUpdateIncident } from "@/hooks/useIncidents";
import { TYPE_LABELS, STATUS_LABELS } from "@/services/incidents";
import type { IncidentType, IncidentStatus } from "@/services/incidents";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function IncidentEdit() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const id = incidentId || "";
  const navigate = useNavigate();
  const { data: incident, isLoading } = useIncident(id);
  const updateMutation = useUpdateIncident();

  const [name, setName] = useState("");
  const [type, setType] = useState<IncidentType>("wildfire");
  const [status, setStatus] = useState<IncidentStatus>("active");
  const [location, setLocation] = useState("");
  const [acres, setAcres] = useState("");
  const [containment, setContainment] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (incident) {
      setName(incident.name);
      setType(incident.type as IncidentType);
      setStatus(incident.status as IncidentStatus);
      setLocation(incident.location);
      setAcres(incident.acres != null ? String(incident.acres) : "");
      setContainment(incident.containment != null ? String(incident.containment) : "");
      setNotes(incident.notes || "");
    }
  }, [incident]);

  const canSubmit = name.trim() && location.trim() && !updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await updateMutation.mutateAsync({
        id,
        updates: {
          name: name.trim(),
          type,
          status,
          location: location.trim(),
          acres: acres ? Number(acres) : null,
          containment: containment ? Number(containment) : null,
          notes: notes.trim() || null,
        },
      });
      toast.success("Incident updated");
      navigate(`/incidents/${id}`);
    } catch {
      toast.error("Failed to update incident");
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Edit Incident">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell
        title="Edit Incident"
        headerRight={
          <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary touch-target">
            Back
          </button>
        }
      >
        <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
          <p className="text-base font-medium">Incident not found</p>
          <p className="text-sm text-muted-foreground">
            It may have been removed or you no longer have access.
          </p>
          <button
            onClick={() => navigate("/incidents")}
            className="mt-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground touch-target"
          >
            Back to Incidents
          </button>
        </div>
      </AppShell>
    );
  }

  const inputClass =
    "w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target";

  return (
    <AppShell
      title="Edit Incident"
      headerRight={
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary touch-target">
          Cancel
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Incident Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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
                  type === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(STATUS_LABELS) as [IncidentStatus, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors touch-target ${
                  status === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Acres</label>
            <input type="number" value={acres} onChange={(e) => setAcres(e.target.value)} className={inputClass} inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Containment %</label>
            <input type="number" value={containment} onChange={(e) => setContainment(e.target.value)} min="0" max="100" className={inputClass} inputMode="numeric" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass + " min-h-[80px]"} />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
        >
          {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </form>
    </AppShell>
  );
}
