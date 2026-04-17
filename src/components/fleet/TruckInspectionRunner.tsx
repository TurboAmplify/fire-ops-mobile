import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, AlertTriangle, MinusCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useDefaultInspectionTemplate,
  useInspectionTemplateItems,
  useSubmitInspection,
} from "@/hooks/useInspections";
import { uploadInspectionPhoto, type InspectionItemStatus } from "@/services/inspections";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truckId: string;
  truckName: string;
  mode?: "walkaround" | "inventory";
}

interface ItemState {
  label: string;
  status: InspectionItemStatus | null;
  notes: string;
  photo_url: string | null;
  uploading?: boolean;
}

export function TruckInspectionRunner({ open, onOpenChange, truckId, truckName, mode = "walkaround" }: Props) {
  const { membership } = useOrganization();
  const { user } = useAuth();
  const orgId = membership?.organizationId;
  const { data: template } = useDefaultInspectionTemplate(orgId, mode);
  const { data: templateItems, isLoading } = useInspectionTemplateItems(template?.id);
  const submit = useSubmitInspection();

  const labels = mode === "inventory"
    ? { ok: "On Truck", issue: "Missing", title: "Inventory", submit: "Submit Inventory", successDone: "Inventory complete", successIssues: (n: number) => `Submitted with ${n} missing` }
    : { ok: "OK", issue: "Issue", title: "Walk-Around", submit: "Submit Walk-Around", successDone: "Walk-around complete", successIssues: (n: number) => `Submitted with ${n} issue${n > 1 ? "s" : ""}` };

  const [items, setItems] = useState<ItemState[]>([]);
  const [overallNotes, setOverallNotes] = useState("");

  useEffect(() => {
    if (open && templateItems) {
      setItems(
        templateItems.map((i) => ({ label: i.label, status: null, notes: "", photo_url: null })),
      );
      setOverallNotes("");
    }
  }, [open, templateItems]);

  const completed = items.filter((i) => i.status !== null).length;
  const issues = items.filter((i) => i.status === "issue").length;
  const allDone = items.length > 0 && completed === items.length;

  const setStatus = (idx: number, status: InspectionItemStatus) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, status } : it)));
  };
  const setNotes = (idx: number, notes: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, notes } : it)));
  };
  const handlePhoto = async (idx: number, file: File) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, uploading: true } : it)));
    try {
      const url = await uploadInspectionPhoto(file, truckId);
      setItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, photo_url: url, uploading: false } : it)),
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Photo upload failed");
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, uploading: false } : it)));
    }
  };

  const handleSubmit = async () => {
    if (!orgId) return;
    if (!allDone) {
      toast.error("Mark every item before submitting");
      return;
    }
    try {
      await submit.mutateAsync({
        truckId,
        organizationId: orgId,
        templateId: template?.id ?? null,
        performedByUserId: user?.id ?? null,
        performedByName: (user?.user_metadata as any)?.full_name ?? user?.email ?? null,
        notes: overallNotes.trim() || null,
        results: items.map((i) => ({
          item_label: i.label,
          status: i.status as InspectionItemStatus,
          notes: i.notes.trim() || null,
          photo_url: i.photo_url,
        })),
      });
      toast.success(issues === 0 ? labels.successDone : labels.successIssues(issues));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{labels.title} · {truckName}</SheetTitle>
            <button onClick={() => onOpenChange(false)} className="touch-target text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(completed / items.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {completed}/{items.length}
                {issues > 0 && <span className="text-destructive ml-1">· {issues} issue{issues > 1 ? "s" : ""}</span>}
              </span>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}
          {!isLoading && items.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground space-y-2">
              <p>No inspection template found.</p>
              <p className="text-xs">Set one up in Organization Settings → Inspection Templates.</p>
            </div>
          )}

          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl bg-card p-3 space-y-2">
              <p className="text-sm font-medium">{item.label}</p>
              <div className="grid grid-cols-3 gap-2">
                <StatusButton
                  active={item.status === "ok"}
                  onClick={() => setStatus(idx, "ok")}
                  icon={CheckCircle2}
                  label={labels.ok}
                  activeClass="bg-success/15 text-success border-success/40"
                />
                <StatusButton
                  active={item.status === "issue"}
                  onClick={() => setStatus(idx, "issue")}
                  icon={AlertTriangle}
                  label={labels.issue}
                  activeClass="bg-destructive/15 text-destructive border-destructive/40"
                />
                <StatusButton
                  active={item.status === "na"}
                  onClick={() => setStatus(idx, "na")}
                  icon={MinusCircle}
                  label="N/A"
                  activeClass="bg-muted text-muted-foreground border-muted-foreground/30"
                />
              </div>
              {item.status === "issue" && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder="Describe the issue..."
                    value={item.notes}
                    onChange={(e) => setNotes(idx, e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  {item.photo_url ? (
                    <div className="relative">
                      <img src={item.photo_url} alt="Issue" className="rounded-lg max-h-40 object-cover w-full" />
                      <button
                        onClick={() =>
                          setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, photo_url: null } : it)))
                        }
                        className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 backdrop-blur"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 py-3 text-xs font-medium text-muted-foreground touch-target cursor-pointer">
                      {item.uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {item.uploading ? "Uploading..." : "Add photo (optional)"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhoto(idx, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          ))}

          {items.length > 0 && (
            <div className="rounded-xl bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall notes (optional)</p>
              <Textarea
                placeholder="Anything else..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div className="border-t bg-background p-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
          <Button
            onClick={handleSubmit}
            disabled={!allDone || submit.isPending}
            className="w-full h-12 text-base"
          >
            {submit.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {labels.submit}
                {items.length > 0 && (
                  <span className="ml-2 opacity-80 text-sm">
                    {completed}/{items.length}
                    {issues > 0 && ` · ${issues} issue${issues > 1 ? "s" : ""}`}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusButton({
  active,
  onClick,
  icon: Icon,
  label,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg border-2 py-2.5 transition-all touch-target ${
        active ? activeClass : "border-border bg-secondary/40 text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
