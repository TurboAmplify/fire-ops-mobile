import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCreateIncident } from "@/hooks/useIncidents";
import { TYPE_LABELS } from "@/services/incidents";
import type { IncidentType } from "@/services/incidents";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function IncidentCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateIncident();
  const [name, setName] = useState("");
  const [type, setType] = useState<IncidentType>("wildfire");
  const [location, setLocation] = useState("");

  const canSubmit = name.trim() && location.trim() && !createMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const incident = await createMutation.mutateAsync({
        name: name.trim(),
        type,
        status: "active",
        location: location.trim(),
        start_date: new Date().toISOString().split("T")[0],
      });
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
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          Cancel
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-4">
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

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target flex items-center justify-center gap-2"
        >
          {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Incident
        </button>
      </form>
    </AppShell>
  );
}
