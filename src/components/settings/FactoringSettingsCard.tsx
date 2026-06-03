import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgFactoringSettings,
  useUpsertOrgFactoringSettings,
  useFactoringEnabled,
} from "@/hooks/useFactoring";
import { uploadFactoringSignature } from "@/services/factoring";
import { useOrganization } from "@/hooks/useOrganization";
import { SignaturePicker } from "@/components/shift-tickets/SignaturePicker";
import { getViewableUrl } from "@/lib/storage-url";

/**
 * Admin-only settings card for the factoring module. Only renders when the
 * super admin has toggled factoring on for the org.
 */
export function FactoringSettingsCard() {
  const qc = useQueryClient();
  const { membership, isAdmin } = useOrganization();
  const { data: enabled } = useFactoringEnabled();
  const { data: settings, isLoading } = useOrgFactoringSettings();
  const upsert = useUpsertOrgFactoringSettings();

  const [factorCompanyName, setFactorCompanyName] = useState("WideQ Financial LLC");
  const [factorContactName, setFactorContactName] = useState("");
  const [factorContactEmail, setFactorContactEmail] = useState("");
  const [factorContactPhone, setFactorContactPhone] = useState("");
  const [reservePercent, setReservePercent] = useState("15");
  const [agreementDate, setAgreementDate] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("Owner");
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signaturePickerOpen, setSignaturePickerOpen] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!settings || initialized.current) return;
    initialized.current = true;
    setFactorCompanyName(settings.factor_company_name || "WideQ Financial LLC");
    setFactorContactName(settings.factor_contact_name ?? "");
    setFactorContactEmail(settings.factor_contact_email ?? "");
    setFactorContactPhone(settings.factor_contact_phone ?? "");
    setReservePercent(String(settings.reserve_percent ?? 15));
    setAgreementDate(settings.agreement_date ?? "");
    setSignerName(settings.signer_name ?? "");
    setSignerTitle(settings.signer_title ?? "Owner");
    if (settings.signature_url) {
      getViewableUrl(settings.signature_url).then((u) => setSignaturePreview(u));
    }
  }, [settings]);

  if (!isAdmin || !enabled) return null;

  const handleSave = async () => {
    const pct = parseFloat(reservePercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Reserve % must be between 0 and 100");
      return;
    }
    try {
      await upsert.mutateAsync({
        factor_company_name: factorCompanyName.trim() || "WideQ Financial LLC",
        factor_contact_name: factorContactName.trim() || null,
        factor_contact_email: factorContactEmail.trim() || null,
        factor_contact_phone: factorContactPhone.trim() || null,
        reserve_percent: pct,
        agreement_date: agreementDate || null,
        signer_name: signerName.trim() || null,
        signer_title: signerTitle.trim() || "Owner",
      });
      toast.success("Factoring settings saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const handleSignatureSave = async (blob: Blob) => {
    if (!membership?.organizationId) return;
    setSignaturePickerOpen(false);
    setUploadingSig(true);
    try {
      const url = await uploadFactoringSignature(membership.organizationId, blob);
      await upsert.mutateAsync({ signature_url: url });
      const preview = await getViewableUrl(url);
      setSignaturePreview(preview);
      toast.success("Signature saved");
    } catch (err: any) {
      toast.error(err?.message || "Could not save signature");
    } finally {
      setUploadingSig(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 shrink-0">
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">Invoice Factoring</CardTitle>
            <CardDescription className="mt-1">
              Recurring details used to generate the Schedule of Accounts and submit signed
              OF-286 packages to your factor.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Factor company</Label>
                <Input
                  value={factorCompanyName}
                  onChange={(e) => setFactorCompanyName(e.target.value)}
                  placeholder="WideQ Financial LLC"
                />
              </div>
              <div>
                <Label className="text-xs">Contact name</Label>
                <Input
                  value={factorContactName}
                  onChange={(e) => setFactorContactName(e.target.value)}
                  placeholder="Anita Hall"
                />
              </div>
              <div>
                <Label className="text-xs">Contact email</Label>
                <Input
                  type="email"
                  value={factorContactEmail}
                  onChange={(e) => setFactorContactEmail(e.target.value)}
                  placeholder="anita@wideqfinancial.com"
                />
              </div>
              <div>
                <Label className="text-xs">Contact phone</Label>
                <Input
                  value={factorContactPhone}
                  onChange={(e) => setFactorContactPhone(e.target.value)}
                  placeholder="(555) 555-0123"
                />
              </div>
              <div>
                <Label className="text-xs">Reserve %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={reservePercent}
                  onChange={(e) => setReservePercent(e.target.value)}
                  placeholder="15"
                />
              </div>
              <div>
                <Label className="text-xs">Factoring agreement date</Label>
                <Input
                  type="date"
                  value={agreementDate}
                  onChange={(e) => setAgreementDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Owner / signer name</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label className="text-xs">Signer title</Label>
                <Input
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Owner"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Owner signature</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSignaturePickerOpen(true)}
                  disabled={uploadingSig}
                >
                  {uploadingSig ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <PenLine className="h-3 w-3 mr-1" />
                  )}
                  {signaturePreview ? "Replace" : "Add"}
                </Button>
              </div>
              {signaturePreview ? (
                <img
                  src={signaturePreview}
                  alt="Saved signature"
                  className="h-16 object-contain bg-background rounded border border-border"
                />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No signature on file. Required to generate signed Schedules.
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
              {upsert.isPending && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              Save factoring settings
            </Button>
          </>
        )}

        <SignaturePicker
          open={signaturePickerOpen}
          onClose={() => setSignaturePickerOpen(false)}
          onSave={handleSignatureSave}
          title="Owner signature"
          defaultName={signerName}
        />
      </CardContent>
    </Card>
  );
}
