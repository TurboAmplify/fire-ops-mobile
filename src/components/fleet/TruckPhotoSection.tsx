import { useRef, useState } from "react";
import {
  useTruckPhotos,
  useUploadTruckPhoto,
  useDeleteTruckPhoto,
  useUpdateTruckPhotoLabel,
  useUpdateTruck,
} from "@/hooks/useFleet";
import { useOrganization } from "@/hooks/useOrganization";
import { Camera, Trash2, Loader2, Tag, ImageIcon, ScanLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SignedImage } from "@/components/ui/SignedImage";
import {
  parseTruckPhoto,
  updateTruckPhotoLabel,
  DOCUMENT_TYPE_TO_LABEL,
  type ParsedTruckPhoto,
} from "@/services/fleet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PHOTO_LABELS = ["Exterior", "Interior", "VIN Plate", "Registration", "Damage", "Equipment", "Other"];

interface TruckPhotoSectionProps {
  truckId: string;
}

type FieldKey = "vin" | "license_plate" | "year" | "make" | "model" | "registration_expires";

const FIELD_LABELS: Record<FieldKey, string> = {
  vin: "VIN",
  license_plate: "License Plate",
  year: "Year",
  make: "Make",
  model: "Model",
  registration_expires: "Registration Expires",
};

export function TruckPhotoSection({ truckId }: TruckPhotoSectionProps) {
  const { membership } = useOrganization();
  const { data: photos, isLoading } = useTruckPhotos(truckId);
  const uploadMutation = useUploadTruckPhoto(truckId);
  const deleteMutation = useDeleteTruckPhoto(truckId);
  const labelMutation = useUpdateTruckPhotoLabel(truckId);
  const updateTruck = useUpdateTruck(truckId);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const scanLibraryRef = useRef<HTMLInputElement>(null);
  const [labelingId, setLabelingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    parsed: ParsedTruckPhoto;
    photoId: string;
  } | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(new Set());
  const [applying, setApplying] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membership) return;
    try {
      await uploadMutation.mutateAsync({ orgId: membership.organizationId, file });
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membership) return;
    e.target.value = "";
    setScanning(true);
    try {
      // Upload first
      const photo = await uploadMutation.mutateAsync({
        orgId: membership.organizationId,
        file,
      });
      // Then parse
      const parsed = await parseTruckPhoto(photo.file_url);

      const hasAnyField = (
        ["vin", "license_plate", "year", "make", "model", "registration_expires"] as FieldKey[]
      ).some((k) => parsed[k] != null && parsed[k] !== "");

      // Auto-set photo label based on detected type
      const autoLabel = DOCUMENT_TYPE_TO_LABEL[parsed.detected_document_type ?? "other"];
      if (autoLabel && autoLabel !== "Other") {
        try {
          await updateTruckPhotoLabel(photo.id, autoLabel);
        } catch {
          // non-fatal
        }
      }

      if (!hasAnyField) {
        toast.info("Couldn't read details from this photo. Try a clearer shot of the VIN plate or registration.");
        return;
      }

      // Pre-select all detected fields
      const detected = new Set<FieldKey>();
      (["vin", "license_plate", "year", "make", "model", "registration_expires"] as FieldKey[]).forEach((k) => {
        if (parsed[k] != null && parsed[k] !== "") detected.add(k);
      });
      setSelectedFields(detected);
      setScanResult({ parsed, photoId: photo.id });
    } catch (err: any) {
      const msg = err?.message ?? "Failed to scan photo";
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async () => {
    if (!scanResult) return;
    const updates: Record<string, any> = {};
    selectedFields.forEach((key) => {
      const val = scanResult.parsed[key];
      if (val == null || val === "") return;
      if (key === "registration_expires") updates.registration_expiry = val;
      else if (key === "license_plate") updates.plate = val;
      else updates[key] = val;
    });

    if (Object.keys(updates).length === 0) {
      setScanResult(null);
      return;
    }

    setApplying(true);
    try {
      await updateTruck.mutateAsync(updates as any);
      toast.success(`Updated ${Object.keys(updates).length} field(s) from photo`);
      setScanResult(null);
      setSelectedFields(new Set());
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update truck");
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleLabel = async (id: string, label: string) => {
    try {
      await labelMutation.mutateAsync({ id, photoLabel: label });
      setLabelingId(null);
    } catch {
      toast.error("Failed to update label");
    }
  };

  const toggleField = (key: FieldKey) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Truck Photos
        </h3>
      </div>

      {/* AI Scan button - prominent */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => scanCameraRef.current?.click()}
          disabled={scanning || uploadMutation.isPending}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground touch-target active:opacity-90 disabled:opacity-60"
        >
          {scanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="h-5 w-5" />}
          {scanning ? "Scanning..." : "Scan VIN / Reg"}
        </button>
        <button
          type="button"
          onClick={() => scanLibraryRef.current?.click()}
          disabled={scanning || uploadMutation.isPending}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary touch-target active:bg-primary/10 disabled:opacity-60"
        >
          <Sparkles className="h-5 w-5" />
          Scan from Library
        </button>
        <input
          ref={scanCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScan}
        />
        <input
          ref={scanLibraryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScan}
        />
      </div>

      {/* Manual upload buttons */}
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-secondary px-3 py-2.5 text-sm font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <Camera className="h-4 w-4" />
          Take Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleUpload}
            disabled={uploadMutation.isPending}
          />
        </label>
        <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-secondary px-3 py-2.5 text-sm font-semibold text-secondary-foreground cursor-pointer touch-target active:bg-muted">
          <ImageIcon className="h-4 w-4" />
          From Library
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      {uploadMutation.isPending && !scanning && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!photos || photos.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No photos yet. Use Scan VIN / Reg to auto-fill truck details, or take a photo manually.
        </p>
      )}

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-lg overflow-hidden bg-secondary">
              <div className="aspect-square">
                <SignedImage
                  src={photo.file_url}
                  alt={photo.photo_label || photo.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {photo.photo_label && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs font-medium text-white truncate">{photo.photo_label}</p>
                </div>
              )}

              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  onClick={() => setLabelingId(labelingId === photo.id ? null : photo.id)}
                  className="rounded-full bg-black/50 p-1.5 text-white touch-target"
                >
                  <Tag className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-full bg-destructive/80 p-1.5 text-destructive-foreground touch-target"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {labelingId === photo.id && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 p-2">
                  {PHOTO_LABELS.map((label) => (
                    <button
                      key={label}
                      onClick={() => handleLabel(photo.id, label)}
                      className={`w-full rounded px-2 py-1.5 text-xs font-medium touch-target ${
                        photo.photo_label === label
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scan result confirmation sheet */}
      <Sheet open={!!scanResult} onOpenChange={(open) => !open && setScanResult(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Detected Details
            </SheetTitle>
            <SheetDescription>
              Review what was found. Uncheck anything that looks wrong, then apply.
            </SheetDescription>
          </SheetHeader>

          {scanResult && (
            <div className="mt-4 space-y-2">
              {(["vin", "license_plate", "year", "make", "model", "registration_expires"] as FieldKey[]).map(
                (key) => {
                  const val = scanResult.parsed[key];
                  if (val == null || val === "") return null;
                  const isChecked = selectedFields.has(key);
                  return (
                    <label
                      key={key}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3 cursor-pointer touch-target"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleField(key)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <Label className="text-xs font-medium text-muted-foreground uppercase">
                          {FIELD_LABELS[key]}
                        </Label>
                        <p className="text-sm font-semibold break-words">{String(val)}</p>
                      </div>
                    </label>
                  );
                }
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setScanResult(null)}
              disabled={applying}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleApply}
              disabled={applying || selectedFields.size === 0}
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apply ${selectedFields.size}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
