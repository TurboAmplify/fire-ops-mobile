import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useTrucks } from "@/hooks/useFleet";
import { useCreateNeedsListItem, useUpdateNeedsListItem } from "@/hooks/useNeedsList";
import { useAuth } from "@/hooks/useAuth";
import type { NeedsListItem } from "@/services/needs-list";
import { toast } from "sonner";

interface NeedsListFormProps {
  item: NeedsListItem | null;
  onClose: () => void;
}

export function NeedsListForm({ item, onClose }: NeedsListFormProps) {
  const { user } = useAuth();
  const { data: crewMembers } = useCrewMembers();
  const { data: trucks } = useTrucks();
  const createItem = useCreateNeedsListItem();
  const updateItem = useUpdateNeedsListItem();

  const [title, setTitle] = useState(item?.title ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [category, setCategory] = useState<"organization" | "crew" | "truck">(
    item?.crew_member_id ? "crew" : item?.truck_id ? "truck" : "organization"
  );
  const [crewMemberId, setCrewMemberId] = useState(item?.crew_member_id ?? "");
  const [truckId, setTruckId] = useState(item?.truck_id ?? "");

  const isEditing = !!item;
  const saving = createItem.isPending || updateItem.isPending;

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Please enter an item name");
      return;
    }

    try {
      if (isEditing) {
        await updateItem.mutateAsync({
          id: item.id,
          updates: {
            title: trimmed,
            notes: notes.trim() || null,
            category,
            crew_member_id: category === "crew" && crewMemberId ? crewMemberId : null,
            truck_id: category === "truck" && truckId ? truckId : null,
          },
        });
        toast.success("Item updated");
      } else {
        await createItem.mutateAsync({
          title: trimmed,
          notes: notes.trim() || null,
          category,
          crew_member_id: category === "crew" && crewMemberId ? crewMemberId : null,
          truck_id: category === "truck" && truckId ? truckId : null,
          created_by_user_id: user?.id ?? null,
        });
        toast.success("Item added");
      }
      onClose();
    } catch (err) {
      console.error("[NeedsListForm] save failed", err);
      const msg = err instanceof Error ? err.message : "Failed to save item";
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card p-5 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{isEditing ? "Edit Item" : "Add Need"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary touch-target"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Item *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need?"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quantity, size, brand, etc."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">For</label>
            <div className="flex gap-2">
              {(["organization", "crew", "truck"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-target ${
                    category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {c === "organization" ? "Org" : c === "crew" ? "Crew" : "Truck"}
                </button>
              ))}
            </div>
          </div>

          {category === "crew" && crewMembers && crewMembers.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Crew Member</label>
              <select
                value={crewMemberId}
                onChange={(e) => setCrewMemberId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select crew member...</option>
                {crewMembers.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {category === "truck" && trucks && trucks.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Truck</label>
              <select
                value={truckId}
                onChange={(e) => setTruckId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select truck...</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50 touch-target"
          >
            {saving ? "Saving…" : isEditing ? "Update" : "Add to List"}
          </button>
        </div>
      </div>
    </div>
  );
}
