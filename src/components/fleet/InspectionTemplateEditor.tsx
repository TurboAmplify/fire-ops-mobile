import { useState } from "react";
import { Loader2, Plus, Trash2, Star, StarOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useInspectionTemplates,
  useInspectionTemplateItems,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useAddTemplateItem,
  useDeleteTemplateItem,
} from "@/hooks/useInspections";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabType = "walkaround" | "inventory";

export function InspectionTemplateEditor() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const [tab, setTab] = useState<TabType>("walkaround");

  const { data: templates, isLoading } = useInspectionTemplates(orgId, tab);
  const createTemplate = useCreateTemplate(orgId);
  const updateTemplate = useUpdateTemplate(orgId);
  const deleteTemplate = useDeleteTemplate(orgId);

  const defaultTpl = templates?.find((t) => t.is_default) ?? templates?.[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? defaultTpl?.id ?? null;
  const active = templates?.find((t) => t.id === activeId) ?? defaultTpl;

  const { data: items, isLoading: loadingItems } = useInspectionTemplateItems(active?.id);
  const addItem = useAddTemplateItem(active?.id);
  const deleteItem = useDeleteTemplateItem(active?.id);

  const [newItemLabel, setNewItemLabel] = useState("");
  const [newTplName, setNewTplName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState<{ id: string; name: string } | null>(null);

  // Reset selection when switching tabs
  const handleTabChange = (next: TabType) => {
    setTab(next);
    setSelectedId(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim() || !active) return;
    try {
      await addItem.mutateAsync({ label: newItemLabel.trim(), sortOrder: items?.length ?? 0 });
      setNewItemLabel("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add");
    }
  };

  const handleCreateTpl = async () => {
    const name = newTplName.trim();
    if (!name) return;
    try {
      const t = await createTemplate.mutateAsync({ name, isDefault: !templates?.length, templateType: tab });
      setSelectedId((t as any).id);
      setNewTplName("");
      toast.success("Template created");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateTemplate.mutateAsync({ id, patch: { is_default: true } });
      toast.success("Default template updated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    }
  };

  const handleDeleteTpl = async () => {
    if (!confirmDeleteTpl) return;
    try {
      await deleteTemplate.mutateAsync(confirmDeleteTpl.id);
      if (selectedId === confirmDeleteTpl.id) setSelectedId(null);
      toast.success("Template deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    }
    setConfirmDeleteTpl(null);
  };

  const handleDeleteItem = async () => {
    if (!confirmDelete) return;
    try {
      await deleteItem.mutateAsync(confirmDelete.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    }
    setConfirmDelete(null);
  };

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Tabs: Walk-Around / Inventory */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => handleTabChange("walkaround")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all touch-target ${
            tab === "walkaround" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Walk-Around
        </button>
        <button
          onClick={() => handleTabChange("inventory")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all touch-target ${
            tab === "inventory" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Inventory
        </button>
      </div>

      {/* Template list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {tab === "walkaround" ? "Walk-Around Templates" : "Inventory Templates"}
        </p>
        {(templates ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No templates yet — create your first below.</p>
        )}
        <div className="space-y-1">
          {(templates ?? []).map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                t.id === active?.id ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <button
                onClick={() => setSelectedId(t.id)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-sm font-medium truncate">{t.name}</p>
                {t.is_default && <p className="text-[10px] text-success font-semibold uppercase tracking-wider">Default</p>}
              </button>
              {!t.is_default && (
                <button
                  onClick={() => handleSetDefault(t.id)}
                  className="p-1.5 text-muted-foreground touch-target"
                  title="Set as default"
                >
                  <StarOff className="h-4 w-4" />
                </button>
              )}
              {t.is_default && <Star className="h-4 w-4 text-success mr-1.5" />}
              <button
                onClick={() => setConfirmDeleteTpl({ id: t.id, name: t.name })}
                className="p-1.5 text-destructive touch-target"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Input
            value={newTplName}
            onChange={(e) => setNewTplName(e.target.value)}
            placeholder="New template name..."
            className="text-sm"
          />
          <Button
            onClick={handleCreateTpl}
            disabled={!newTplName.trim() || createTemplate.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Items in active template */}
      {active && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Items in &quot;{active.name}&quot;
          </p>

          {loadingItems && (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          )}

          {!loadingItems && (items?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          )}

          <div className="space-y-1">
            {(items ?? []).map((it) => (
              <div key={it.id} className="flex items-center gap-2 rounded-lg bg-card p-2.5">
                <span className="flex-1 text-sm">{it.label}</span>
                <button
                  onClick={() => setConfirmDelete({ id: it.id, label: it.label })}
                  className="p-1 text-muted-foreground touch-target"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2 pt-1">
            <Input
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder="Add item..."
              className="text-sm"
            />
            <Button type="submit" disabled={!newItemLabel.trim() || addItem.isPending} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{confirmDelete?.label}&quot; from this template?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteTpl} onOpenChange={(o) => !o && setConfirmDeleteTpl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{confirmDeleteTpl?.name}&quot;? All items in this template will be removed.
              Existing completed inspections are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTpl}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
