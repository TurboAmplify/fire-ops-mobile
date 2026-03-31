import { AppShell } from "@/components/AppShell";
import {
  useNeedsList,
  useCreateNeedsListItem,
  useUpdateNeedsListItem,
  useDeleteNeedsListItem,
} from "@/hooks/useNeedsList";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useTrucks } from "@/hooks/useFleet";
import { Plus, Loader2, Check, RotateCcw, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { NeedsListForm } from "@/components/needs/NeedsListForm";
import type { NeedsListItem } from "@/services/needs-list";

export default function NeedsList() {
  const { data: items, isLoading, error } = useNeedsList();
  const { data: crewMembers } = useCrewMembers();
  const { data: trucks } = useTrucks();
  const updateItem = useUpdateNeedsListItem();
  const deleteItem = useDeleteNeedsListItem();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<NeedsListItem | null>(null);
  const [filter, setFilter] = useState<"active" | "purchased">("active");

  const activeItems = items?.filter((i) => !i.is_purchased) ?? [];
  const purchasedItems = items?.filter((i) => i.is_purchased) ?? [];
  const displayed = filter === "active" ? activeItems : purchasedItems;

  const handlePurchase = (item: NeedsListItem) => {
    updateItem.mutate({
      id: item.id,
      updates: { is_purchased: true, purchased_at: new Date().toISOString() },
    });
  };

  const handleReactivate = (item: NeedsListItem) => {
    updateItem.mutate({
      id: item.id,
      updates: { is_purchased: false, purchased_at: null },
    });
  };

  const handleEdit = (item: NeedsListItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const getLinkedName = (item: NeedsListItem) => {
    if (item.crew_member_id) {
      const crew = crewMembers?.find((c) => c.id === item.crew_member_id);
      return crew?.name ?? "Crew member";
    }
    if (item.truck_id) {
      const truck = trucks?.find((t) => t.id === item.truck_id);
      return truck?.name ?? "Truck";
    }
    return "Organization";
  };

  const getCategoryColor = (item: NeedsListItem) => {
    if (item.crew_member_id) return "bg-blue-500/15 text-blue-600";
    if (item.truck_id) return "bg-amber-500/15 text-amber-600";
    return "bg-primary/10 text-primary";
  };

  return (
    <AppShell
      title="Needs List"
      headerRight={
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors touch-target ${
              filter === "active"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            Active ({activeItems.length})
          </button>
          <button
            onClick={() => setFilter("purchased")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors touch-target ${
              filter === "purchased"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            Purchased ({purchasedItems.length})
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-12 text-center text-destructive">Failed to load needs list.</p>
        )}

        {!isLoading && !error && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <ShoppingCart className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === "active" ? "No items needed right now." : "No purchased items yet."}
            </p>
          </div>
        )}

        {!isLoading && !error && displayed.length > 0 && (
          <div className="space-y-2">
            {displayed.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl bg-card p-4 card-shadow transition-all ${
                  item.is_purchased ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Purchase / Reactivate button */}
                  <button
                    onClick={() =>
                      item.is_purchased ? handleReactivate(item) : handlePurchase(item)
                    }
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all touch-target ${
                      item.is_purchased
                        ? "border-green-500 bg-green-500/15 text-green-600"
                        : "border-border text-transparent hover:border-primary/40"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p
                      className={`font-semibold text-sm ${
                        item.is_purchased ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
                    )}
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getCategoryColor(
                        item
                      )}`}
                    >
                      {getLinkedName(item)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-secondary touch-target"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this item?")) deleteItem.mutate(item.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-destructive/10 active:text-destructive touch-target"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <NeedsListForm item={editingItem} onClose={handleClose} />}
    </AppShell>
  );
}
