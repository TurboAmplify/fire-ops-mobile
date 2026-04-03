import { useState } from "react";
import { X } from "lucide-react";
import { SignaturePicker } from "./SignaturePicker";
import type { SignatureMetadata } from "./SignaturePicker";

interface SupervisorSignatureSheetProps {
  open: boolean;
  onClose: () => void;
  supervisorName: string;
  supervisorRO: string;
  supervisorSigUrl: string | null;
  onSupervisorNameChange: (v: string) => void;
  onSupervisorROChange: (v: string) => void;
  onSign: (blob: Blob, metadata: SignatureMetadata) => void;
  onClearSignature: () => void;
  uploadingSig: boolean;
}

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target";
const labelClass = "text-[11px] font-medium text-muted-foreground";

export function SupervisorSignatureSheet({
  open,
  onClose,
  supervisorName,
  supervisorRO,
  supervisorSigUrl,
  onSupervisorNameChange,
  onSupervisorROChange,
  onSign,
  onClearSignature,
  uploadingSig,
}: SupervisorSignatureSheetProps) {
  const [showSignaturePicker, setShowSignaturePicker] = useState(false);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold">Incident Supervisor</span>
          <button onClick={onClose} className="p-2 touch-target">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>33. Supervisor Name</label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => onSupervisorNameChange(e.target.value)}
              placeholder="Full name"
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Resource Order # */}
          <div>
            <label className={labelClass}>Resource Order #</label>
            <input
              type="text"
              value={supervisorRO}
              onChange={(e) => onSupervisorROChange(e.target.value)}
              placeholder="E-123456"
              className={inputClass}
            />
          </div>

          {/* Signature */}
          <div>
            <label className={labelClass}>34. Signature</label>
            {supervisorSigUrl ? (
              <div className="mt-1 space-y-2">
                <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-center">
                  <img
                    src={supervisorSigUrl}
                    alt="Supervisor signature"
                    className="h-20 max-w-full object-contain"
                  />
                </div>
                <button
                  onClick={onClearSignature}
                  className="text-xs text-destructive touch-target"
                >
                  Clear signature
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSignaturePicker(true)}
                disabled={uploadingSig}
                className="mt-1 w-full rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted-foreground touch-target disabled:opacity-40 active:bg-accent/30"
              >
                Tap to sign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SignaturePicker opens on top */}
      <SignaturePicker
        open={showSignaturePicker}
        onClose={() => setShowSignaturePicker(false)}
        onSave={(blob, metadata) => {
          setShowSignaturePicker(false);
          onSign(blob, metadata);
        }}
        title="Supervisor Signature"
        defaultName={supervisorName}
      />
    </>
  );
}
