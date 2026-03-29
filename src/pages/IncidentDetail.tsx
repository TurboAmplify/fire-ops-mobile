import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate } from "react-router-dom";
import { getIncident, STATUS_LABELS, TYPE_LABELS } from "@/lib/incidents";
import { ArrowLeft, MapPin, Calendar, Flame, TrendingUp } from "lucide-react";

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const incident = getIncident(id || "");

  if (!incident) {
    return (
      <AppShell title="Incident">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>Incident not found.</p>
          <button onClick={() => navigate("/incidents")} className="mt-4 text-primary font-semibold touch-target">
            Back to Incidents
          </button>
        </div>
      </AppShell>
    );
  }

  const statusColor =
    incident.status === "active"
      ? "bg-destructive/15 text-destructive"
      : "bg-success/15 text-success";

  return (
    <AppShell
      title=""
      headerRight={
        <button onClick={() => navigate("/incidents")} className="flex items-center gap-1 text-sm font-medium text-primary touch-target">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      }
    >
      <div className="p-4 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-extrabold">{incident.name}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusColor}`}>
              {STATUS_LABELS[incident.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{TYPE_LABELS[incident.type]}</p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={MapPin} label="Location" value={incident.location} />
          <InfoCard icon={Calendar} label="Start Date" value={incident.startDate} />
          {incident.acres != null && (
            <InfoCard icon={Flame} label="Acres" value={incident.acres.toLocaleString()} />
          )}
          {incident.containment != null && (
            <InfoCard icon={TrendingUp} label="Containment" value={`${incident.containment}%`} />
          )}
        </div>

        {/* Containment bar */}
        {incident.containment != null && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Containment Progress</p>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${incident.containment}%` }}
              />
            </div>
          </div>
        )}

        {/* Notes placeholder */}
        {incident.notes && (
          <div className="rounded-xl bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{incident.notes}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
