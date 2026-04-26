import { AppShell } from "@/components/AppShell";
import { useParams, useNavigate } from "react-router-dom";
import { useIncident, useUpdateIncident, useDeleteIncident } from "@/hooks/useIncidents";
import { STATUS_LABELS, STATUS_COLORS, TYPE_LABELS } from "@/services/incidents";
import type { IncidentStatus } from "@/services/incidents";
import { ArrowLeft, MapPin, Calendar, Flame, TrendingUp, Loader2, Pencil, Trash2, ChevronDown } from "lucide-react";
import { IncidentTruckList } from "@/components/incidents/IncidentTruckList";
import { IncidentDailyCrewGrid } from "@/components/incidents/IncidentDailyCrewGrid";
import { IncidentResourceOrdersRollup } from "@/components/incidents/IncidentResourceOrdersRollup";
import { IncidentTicketsTab } from "@/components/incidents/IncidentTicketsTab";
import { OF286UploadCard } from "@/components/incidents/OF286UploadCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [tab, setTab] = useState<"overview" | "trucks" | "tickets" | "crew">("tickets");

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
  const showOF286 = incident.status === "demob" || incident.status === "closed";

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
      <div className="px-4 py-3 space-y-3">
        {/* Header — name + type + status pill */}
        <header className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold leading-tight truncate">{incident.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                {TYPE_LABELS[incident.type as keyof typeof TYPE_LABELS]}
              </p>
            </div>
            <button
              onClick={() => setEditingStatus(!editingStatus)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase shrink-0 transition-colors active:opacity-80 touch-target ${statusColor}`}
              aria-label="Change status"
            >
              <span>{STATUS_LABELS[incident.status as IncidentStatus]}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${editingStatus ? "rotate-180" : ""}`} />
            </button>
          </div>

          {editingStatus && (
            <div className="flex gap-2 flex-wrap pt-2 animate-fade-in">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updateMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium touch-target ${
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
        </header>

        {/* Compact one-line meta strip — pills, no tall card */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1">
            <MapPin className="h-3 w-3" />
            <span className="font-medium text-foreground truncate max-w-[180px]">{incident.location}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1">
            <Calendar className="h-3 w-3" />
            <span className="font-medium text-foreground">{incident.start_date}</span>
          </span>
          {incident.acres != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1">
              <Flame className="h-3 w-3" />
              <span className="font-medium text-foreground">{Number(incident.acres).toLocaleString()} ac</span>
            </span>
          )}
          {incident.containment != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium text-foreground">{incident.containment}%</span>
            </span>
          )}
        </div>

        {/* Tabs — Tickets is default */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="trucks">Trucks</TabsTrigger>
            <TabsTrigger value="crew">Crew</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* TICKETS — primary workflow */}
          <TabsContent value="tickets" className="mt-0">
            <IncidentTicketsTab incidentId={incident.id} incidentName={incident.name} />
          </TabsContent>

          {/* TRUCKS */}
          <TabsContent value="trucks" className="mt-0">
            <IncidentTruckList
              incidentId={incident.id}
              incidentName={incident.name}
              organizationId={incident.organization_id}
            />
          </TabsContent>

          {/* CREW */}
          <TabsContent value="crew" className="mt-0">
            <IncidentDailyCrewGrid incidentId={incident.id} />
          </TabsContent>

          {/* OVERVIEW — notes, documents, danger zone */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {incident.notes && (
              <div className="rounded-xl bg-card p-4 card-shadow">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                <p className="text-sm leading-relaxed">{incident.notes}</p>
              </div>
            )}

            <IncidentResourceOrdersRollup incidentId={incident.id} />

            {/* OF-286 only matters at demob/close */}
            {showOF286 && (
              <OF286UploadCard incidentId={incident.id} incidentStatus={incident.status} />
            )}

            <div className="pt-2 flex justify-end">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors touch-target"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Incident
                </button>
              ) : (
                <div className="w-full space-y-3">
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
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
