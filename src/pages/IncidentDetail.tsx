import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate } from "react-router-dom";
import { useIncident, useUpdateIncident, useDeleteIncident } from "@/hooks/useIncidents";
import { STATUS_LABELS, STATUS_COLORS, TYPE_LABELS } from "@/services/incidents";
import type { IncidentStatus } from "@/services/incidents";
import { ArrowLeft, MapPin, Calendar, Flame, TrendingUp, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { IncidentTruckList } from "@/components/incidents/IncidentTruckList";
import { IncidentDailyCrewGrid } from "@/components/incidents/IncidentDailyCrewGrid";
import { AgreementUpload } from "@/components/incidents/AgreementUpload";
import { OF286UploadCard } from "@/components/incidents/OF286UploadCard";
import { useIncidentDocuments } from "@/hooks/useIncidentDocuments";
import { useState } from "react";
import { toast } from "sonner";

const statusOptions: IncidentStatus[] = ["active", "demob", "closed"];

export default function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const id = incidentId || "";
  const navigate = useNavigate();
  const { data: incident, isLoading, error } = useIncident(id);
  const updateMutation = useUpdateIncident();
  const deleteMutation = useDeleteIncident();
  const [editingStatus, setEditingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: of286Docs } = useIncidentDocuments(id, "of286");
  const hasNoOF286 = !of286Docs || of286Docs.length === 0;
  // Only flag missing OF-286 once the incident is winding down (demob/closed).
  const showMissingOF286 =
    hasNoOF286 && (incident?.status === "demob" || incident?.status === "closed");

  if (isLoading) {
    return (
      <AppShell title="">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (error || !incident) {
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

  const statusColor = STATUS_COLORS[incident.status as IncidentStatus] || "bg-secondary text-muted-foreground";

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    try {
      await updateMutation.mutateAsync({ id: incident.id, updates: { status: newStatus } });
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      setEditingStatus(false);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(incident.id);
      toast.success("Incident deleted");
      navigate("/incidents");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete incident");
      setConfirmDelete(false);
    }
  };

  return (
    <AppShell
      title=""
      headerRight={
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/incidents/${id}/edit`)}
            className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button onClick={() => navigate("/incidents")} className="flex items-center gap-1 text-sm font-medium text-primary touch-target">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-extrabold">{incident.name}</h2>
            <button
              onClick={() => setEditingStatus(!editingStatus)}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusColor} touch-target`}
            >
              {STATUS_LABELS[incident.status as IncidentStatus]}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{TYPE_LABELS[incident.type as keyof typeof TYPE_LABELS]}</p>
        </div>

        {/* Missing OF-286 banner */}
        {showMissingOF286 && (
          <div
            className={`flex items-start gap-2 rounded-xl border p-3 ${
              incident.status === "closed"
                ? "border-destructive/40 bg-destructive/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 shrink-0 mt-0.5 ${
                incident.status === "closed" ? "text-destructive" : "text-amber-600"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold">Missing OF-286 invoice</p>
              <p className="text-xs text-muted-foreground">
                {incident.status === "closed"
                  ? "This incident is closed but no signed OF-286 is on file. Upload it below to enable invoicing."
                  : "Upload the signed OF-286 once received. It feeds your accounts receivable."}
              </p>
            </div>
          </div>
        )}

        {/* Status editor */}
        {editingStatus && (
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updateMutation.isPending}
                className={`rounded-full px-4 py-2 text-sm font-medium touch-target ${
                  incident.status === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={MapPin} label="Location" value={incident.location} />
          <InfoCard icon={Calendar} label="Start Date" value={incident.start_date} />
          {incident.acres != null && (
            <InfoCard icon={Flame} label="Acres" value={Number(incident.acres).toLocaleString()} />
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

        {/* Notes */}
        {incident.notes && (
          <div className="rounded-xl bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{incident.notes}</p>
          </div>
        )}

        {/* OF-286 Invoice */}
        <OF286UploadCard incidentId={incident.id} />

        {/* Incident-level Agreements */}
        <AgreementUpload incidentId={incident.id} label="Incident Agreements" />

        {/* Assigned Trucks */}
        <IncidentTruckList
          incidentId={incident.id}
          incidentName={incident.name}
          organizationId={incident.organization_id}
        />

        {/* Daily Crew */}
        <IncidentDailyCrewGrid incidentId={incident.id} />

        {/* Delete zone */}
        <div className="pt-4 border-t border-border">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-sm font-medium text-destructive touch-target"
            >
              <Trash2 className="h-4 w-4" />
              Delete Incident
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-destructive font-medium">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground touch-target flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl bg-secondary py-3 text-sm font-bold text-secondary-foreground touch-target"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
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
