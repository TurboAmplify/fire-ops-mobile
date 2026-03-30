import { useState } from "react";
import { useServiceLogs, useCreateServiceLog, useDeleteServiceLog } from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { SERVICE_TYPE_LABELS } from "@/services/fleet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Wrench, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TruckServiceLogSectionProps {
  truckId: string;
}

export function TruckServiceLogSection({ truckId }: TruckServiceLogSectionProps) {
  const { membership } = useOrganization();
  const { data: logs, isLoading } = useServiceLogs(truckId);
  const createMutation = useCreateServiceLog(truckId);
  const deleteMutation = useDeleteServiceLog(truckId);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [serviceType, setServiceType] = useState("oil_change");
  const [description, setDescription] = useState("");
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [performedAt, setPerformedAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [performedBy, setPerformedBy] = useState("");
  const [nextDueAt, setNextDueAt] = useState("");
  const [nextDueMileage, setNextDueMileage] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setServiceType("oil_change");
    setDescription("");
    setMileage("");
    setCost("");
    setPerformedAt(format(new Date(), "yyyy-MM-dd"));
    setPerformedBy("");
    setNextDueAt("");
    setNextDueMileage("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membership) return;
    try {
      await createMutation.mutateAsync({
        truck_id: truckId,
        organization_id: membership.organizationId,
        service_type: serviceType,
        description: description.trim() || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        cost: cost ? parseFloat(cost) : undefined,
        performed_at: performedAt,
        performed_by: performedBy.trim() || undefined,
        next_due_at: nextDueAt || undefined,
        next_due_mileage: nextDueMileage ? parseInt(nextDueMileage) : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Service log added");
      resetForm();
      setShowForm(false);
    } catch {
      toast.error("Failed to add service log");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Service log removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Service & Maintenance
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-sm font-medium text-primary touch-target"
        >
          <Plus className="h-4 w-4" />
          Log Service
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl bg-card p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was done..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date Performed</Label>
              <Input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mileage</Label>
              <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="Miles" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cost ($)</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Performed By</Label>
              <Input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Name / shop" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Next Due Date</Label>
              <Input type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Next Due Mileage</Label>
              <Input type="number" value={nextDueMileage} onChange={(e) => setNextDueMileage(e.target.value)} placeholder="Miles" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground touch-target disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Save Service Log"}
          </button>
        </form>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!logs || logs.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">No service history yet.</p>
      )}

      {logs && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <ServiceLogCard key={log.id} log={log} onDelete={() => handleDelete(log.id)} deleting={deleteMutation.isPending} />
          ))}
        </div>
      )}
    </section>
  );
}

function ServiceLogCard({ log, onDelete, deleting }: { log: any; onDelete: () => void; deleting: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left touch-target"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {SERVICE_TYPE_LABELS[log.service_type] ?? log.service_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {log.performed_at}
              {log.mileage && ` · ${log.mileage.toLocaleString()} mi`}
              {log.cost && ` · $${Number(log.cost).toFixed(2)}`}
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-1 text-sm">
          {log.description && <p>{log.description}</p>}
          {log.performed_by && <p className="text-muted-foreground">By: {log.performed_by}</p>}
          {log.next_due_at && <p className="text-muted-foreground">Next due: {log.next_due_at}</p>}
          {log.next_due_mileage && <p className="text-muted-foreground">Next due mileage: {log.next_due_mileage.toLocaleString()} mi</p>}
          {log.notes && <p className="text-muted-foreground">{log.notes}</p>}
          <button
            onClick={onDelete}
            disabled={deleting}
            className="mt-2 flex items-center gap-1 text-xs text-destructive touch-target"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
