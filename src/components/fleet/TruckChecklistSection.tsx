import { useState } from "react";
import {
  useTruckChecklist,
  useAddChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
  useInitializeDefaultChecklist,
  useResetChecklist,
} from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ListChecks, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface TruckChecklistSectionProps {
  truckId: string;
}

export function TruckChecklistSection({ truckId }: TruckChecklistSectionProps) {
  const { membership } = useOrganization();
  const { data: items, isLoading } = useTruckChecklist(truckId);
  const addMutation = useAddChecklistItem(truckId);
  const toggleMutation = useToggleChecklistItem(truckId);
  const deleteMutation = useDeleteChecklistItem(truckId);
  const initMutation = useInitializeDefaultChecklist(truckId);
  const resetMutation = useResetChecklist(truckId);
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !membership) return;
    try {
      await addMutation.mutateAsync({
        orgId: membership.organizationId,
        label: newLabel.trim(),
        sortOrder: items?.length ?? 0,
      });
      setNewLabel("");
    } catch {
      toast.error("Failed to add item");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, isComplete: !current });
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleInitDefaults = async () => {
    if (!membership) return;
    try {
      await initMutation.mutateAsync(membership.organizationId);
      toast.success("Walk-around checklist loaded");
    } catch {
      toast.error("Failed to load defaults");
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
      toast.success("Checklist reset — ready for next walk-around");
    } catch {
      toast.error("Failed to reset");
    }
  };

  const completedCount = items?.filter((i) => i.is_complete).length ?? 0;
  const totalCount = items?.length ?? 0;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Walk-Around Checklist {totalCount > 0 && `(${completedCount}/${totalCount})`}
        </h3>
        {totalCount > 0 && (
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground touch-target"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${allComplete ? "bg-success" : "bg-primary"}`}
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">No checklist items yet.</p>
          <button
            onClick={handleInitDefaults}
            disabled={initMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground touch-target"
          >
            <ListChecks className="h-4 w-4" />
            {initMutation.isPending ? "Loading..." : "Load Walk-Around Checklist"}
          </button>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg bg-card p-3">
              <Checkbox
                checked={item.is_complete}
                onCheckedChange={() => handleToggle(item.id, item.is_complete)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.is_complete ? "line-through text-muted-foreground" : ""}`}>
                  {item.label}
                </p>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="p-1 text-muted-foreground touch-target"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All complete banner */}
      {allComplete && (
        <div className="rounded-lg bg-success/10 p-3 text-center">
          <p className="text-sm font-semibold text-success">✓ Walk-around complete — truck is ready</p>
        </div>
      )}

      {/* Add custom item */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add checklist item..."
          className="flex-1"
        />
        <button
          type="submit"
          disabled={addMutation.isPending || !newLabel.trim()}
          className="rounded-lg bg-primary px-3 py-2 text-primary-foreground touch-target disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
