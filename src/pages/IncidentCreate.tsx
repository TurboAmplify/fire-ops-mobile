import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createIncident, TYPE_LABELS } from "@/lib/incidents";
import type { IncidentType } from "@/lib/incidents";

export default function IncidentCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<IncidentType>("wildfire");
  const [location, setLocation] = useState("");

  const canSubmit = name.trim() && location.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const incident = createIncident({
      name: name.trim(),
      type,
      status: "active",
      location: location.trim(),
      startDate: new Date().toISOString().split("T")[0],
    });
    navigate(`/incidents/${incident.id}`);
  };

  return (
    <AppShell title="New Incident">
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
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40 touch-target"
        >
          Create Incident
        </button>
      </form>
    </AppShell>
  );
}
