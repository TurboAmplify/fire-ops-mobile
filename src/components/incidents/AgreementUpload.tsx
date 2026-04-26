import { useState } from "react";
import { useAgreements, useCreateAgreement } from "@/hooks/useAgreements";
import { uploadAgreementFile } from "@/services/agreements";
import { FileText, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { SignedLink } from "@/components/ui/SignedLink";

interface Props {
  incidentId?: string;
  incidentTruckId?: string;
  label?: string;
}

export function AgreementUpload({ incidentId, incidentTruckId, label = "Agreements" }: Props) {
  const { membership } = useOrganization();
  const queryParams = { incidentId, incidentTruckId };
  const { data: agreements, isLoading } = useAgreements(queryParams);
  const createMutation = useCreateAgreement(queryParams);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileUrl = await uploadAgreementFile(file, membership?.organizationId);
      await createMutation.mutateAsync({
        incident_id: incidentId || null,
        incident_truck_id: incidentTruckId || null,
        file_url: fileUrl,
        file_name: file.name,
      });
      toast.success("Agreement uploaded");
    } catch {
      toast.error("Failed to upload agreement");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const isEmpty = !isLoading && (!agreements || agreements.length === 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {isEmpty && (
            <p className="text-xs text-muted-foreground normal-case truncate">— No agreements uploaded.</p>
          )}
        </div>
        <label className="flex items-center gap-1 text-xs font-medium text-primary cursor-pointer touch-target shrink-0">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{uploading ? "Uploading..." : "Upload"}</span>
          <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}


      {agreements?.map((ag) => (
        <SignedLink
          key={ag.id}
          href={ag.file_url}
          className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 touch-target"
        >
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{ag.file_name}</p>
            {ag.agreement_number && (
              <p className="text-xs text-primary font-semibold">Agreement: {ag.agreement_number}</p>
            )}
          </div>
        </SignedLink>
      ))}
    </div>
  );
}
