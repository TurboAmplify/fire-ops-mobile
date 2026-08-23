import { Camera, Upload, Loader2 } from "lucide-react";

type FileHandler = (e: React.ChangeEvent<HTMLInputElement>) => void;

/**
 * Full-width "Take Photo" button that opens the device camera directly.
 * On desktop browsers `capture` is ignored and it behaves like a file picker.
 */
export function TakePhotoButton({
  onFile,
  disabled,
  label = "Take Photo",
  className = "",
}: {
  onFile: FileHandler;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <label
      className={`flex w-full items-center justify-center gap-2 rounded-xl border bg-card px-4 py-4 text-sm font-semibold text-foreground cursor-pointer transition-colors active:bg-secondary touch-target ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      <Camera className="h-4 w-4 text-primary" />
      {label}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={onFile}
      />
    </label>
  );
}

/**
 * Compact camera + upload pair used in the Resource Orders list header.
 */
export function ResourceOrderFileButtons({
  onFile,
  busy,
  busyLabel = "Uploading...",
}: {
  onFile: FileHandler;
  busy?: boolean;
  busyLabel?: string;
}) {
  if (busy) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground touch-target">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {busyLabel}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1 text-xs font-medium text-primary cursor-pointer touch-target">
        <Camera className="h-3.5 w-3.5" />
        <span>Photo</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
      </label>
      <label className="flex items-center gap-1 text-xs font-medium text-primary cursor-pointer touch-target">
        <Upload className="h-3.5 w-3.5" />
        <span>Upload</span>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={onFile} />
      </label>
    </div>
  );
}
