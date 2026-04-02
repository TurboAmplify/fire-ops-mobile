import { useState, useEffect } from "react";
import { Plus, Loader2, FileText, Save, Download, AlertTriangle, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SignatureCanvas } from "./SignatureCanvas";
import { EquipmentEntryRow } from "./EquipmentEntryRow";
import { PersonnelEntryRow } from "./PersonnelEntryRow";
import { MilitaryTimeInput } from "./MilitaryTimeInput";
import { uploadSignature, computeHours, buildRemarksString } from "@/services/shift-tickets";
import type { ShiftTicket, EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";
import type { IncidentTruckCrewWithMember } from "@/services/incident-truck-crew";

interface ShiftTicketFormProps {
  ticket: Partial<ShiftTicket> | null;
  incidentTruckId: string;
  organizationId: string;
  saving: boolean;
  onSave: (data: Partial<ShiftTicket>) => void | Promise<void>;
  onExportPdf: (sigOverrides: { contractor_rep_signature_url: string | null; supervisor_signature_url: string | null }) => void;
  onBack: () => void;
  exportingPdf?: boolean;
  warnings?: string[];
  crewRoster?: IncidentTruckCrewWithMember[];
}

const emptyEquipmentEntry = (): EquipmentEntry => ({
  date: new Date().toISOString().split("T")[0],
  start: "",
  stop: "",
  total: 0,
  quantity: "1",
  type: "Day",
  remarks: "",
});

const emptyPersonnelEntry = (): PersonnelEntry => ({
  date: new Date().toISOString().split("T")[0],
  operator_name: "",
  op_start: "",
  op_stop: "",
  sb_start: "",
  sb_stop: "",
  total: 0,
  remarks: "Work",
  activity_type: "work",
  lodging: false,
  per_diem_b: false,
  per_diem_l: false,
  per_diem_d: false,
});

const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target";
const labelClass = "text-[11px] font-medium text-muted-foreground";

export function ShiftTicketForm({
  ticket,
  incidentTruckId,
  organizationId,
  saving,
  onSave,
  onExportPdf,
  onBack,
  exportingPdf,
  warnings,
  crewRoster,
}: ShiftTicketFormProps) {
  // Header fields
  const [agreementNumber, setAgreementNumber] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [resourceOrderNumber, setResourceOrderNumber] = useState("");
  const [incidentName, setIncidentName] = useState("");
  const [incidentNumber, setIncidentNumber] = useState("");
  const [financialCode, setFinancialCode] = useState("");
  const [equipmentMakeModel, setEquipmentMakeModel] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [serialVin, setSerialVin] = useState("");
  const [licenseId, setLicenseId] = useState("");

  // Flags
  const [transportRetained, setTransportRetained] = useState(false);
  const [isFirstLast, setIsFirstLast] = useState(false);
  const [firstLastType, setFirstLastType] = useState("mobilization");
  const [miles, setMiles] = useState("");

  // Entries
  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>([emptyEquipmentEntry()]);
  const [personnelEntries, setPersonnelEntries] = useState<PersonnelEntry[]>([emptyPersonnelEntry()]);

  // Remarks & signatures
  const [remarks, setRemarks] = useState("");
  const [contractorRepName, setContractorRepName] = useState("");
  const [contractorSigUrl, setContractorSigUrl] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorRO, setSupervisorRO] = useState("");
  const [supervisorSigUrl, setSupervisorSigUrl] = useState<string | null>(null);

  // Signature modal
  const [sigModal, setSigModal] = useState<"contractor" | "supervisor" | null>(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [pendingSigs, setPendingSigs] = useState<Record<string, Blob>>({});

  // Populate from existing ticket
  useEffect(() => {
    if (!ticket) return;
    setAgreementNumber(ticket.agreement_number || "");
    setContractorName(ticket.contractor_name || "");
    setResourceOrderNumber(ticket.resource_order_number || "");
    setIncidentName(ticket.incident_name || "");
    setIncidentNumber(ticket.incident_number || "");
    setFinancialCode(ticket.financial_code || "");
    setEquipmentMakeModel(ticket.equipment_make_model || "");
    setEquipmentType(ticket.equipment_type || "");
    setSerialVin(ticket.serial_vin_number || "");
    setLicenseId(ticket.license_id_number || "");
    setTransportRetained(ticket.transport_retained || false);
    setIsFirstLast(ticket.is_first_last || false);
    setFirstLastType(ticket.first_last_type || "mobilization");
    setMiles(ticket.miles?.toString() || "");
    if (ticket.equipment_entries && (ticket.equipment_entries as EquipmentEntry[]).length > 0) {
      setEquipmentEntries(ticket.equipment_entries as EquipmentEntry[]);
    }
    if (ticket.personnel_entries && (ticket.personnel_entries as PersonnelEntry[]).length > 0) {
      setPersonnelEntries(ticket.personnel_entries as PersonnelEntry[]);
    }
    setRemarks(ticket.remarks || "");
    setContractorRepName(ticket.contractor_rep_name || "");
    setContractorSigUrl((current) => ticket.contractor_rep_signature_url || (current?.startsWith("blob:") ? current : null));
    setSupervisorName(ticket.supervisor_name || "");
    setSupervisorRO(ticket.supervisor_resource_order || "");
    setSupervisorSigUrl((current) => ticket.supervisor_signature_url || (current?.startsWith("blob:") ? current : null));
  }, [ticket]);

  const getPersistedSignatureUrl = (url: string | null) => (url && !url.startsWith("blob:") ? url : null);

  const handleSave = () => {
    const persistedContractorSigUrl = getPersistedSignatureUrl(contractorSigUrl);
    const persistedSupervisorSigUrl = getPersistedSignatureUrl(supervisorSigUrl);

    onSave({
      incident_truck_id: incidentTruckId,
      organization_id: organizationId,
      agreement_number: agreementNumber || null,
      contractor_name: contractorName || null,
      resource_order_number: resourceOrderNumber || null,
      incident_name: incidentName || null,
      incident_number: incidentNumber || null,
      financial_code: financialCode || null,
      equipment_make_model: equipmentMakeModel || null,
      equipment_type: equipmentType || null,
      serial_vin_number: serialVin || null,
      license_id_number: licenseId || null,
      transport_retained: transportRetained,
      is_first_last: isFirstLast,
      first_last_type: isFirstLast ? firstLastType : null,
      miles: miles ? parseFloat(miles) : null,
      equipment_entries: equipmentEntries as any,
      personnel_entries: personnelEntries as any,
      remarks: remarks || null,
      contractor_rep_name: contractorRepName || null,
      contractor_rep_signature_url: persistedContractorSigUrl,
      contractor_rep_signed_at: persistedContractorSigUrl ? new Date().toISOString() : null,
      supervisor_name: supervisorName || null,
      supervisor_resource_order: supervisorRO || null,
      supervisor_signature_url: persistedSupervisorSigUrl,
      supervisor_signed_at: persistedSupervisorSigUrl ? new Date().toISOString() : null,
      status: "draft",
    });
  };

  const handleSignatureSave = async (blob: Blob) => {
    if (!sigModal) return;
    const sigType = sigModal;
    setSigModal(null);

    if (!ticket?.id) {
      const localUrl = URL.createObjectURL(blob);
      if (sigType === "contractor") setContractorSigUrl(localUrl);
      else setSupervisorSigUrl(localUrl);
      setPendingSigs((prev) => ({ ...prev, [sigType]: blob }));
      toast.success("Signature captured -- save draft to upload");
      return;
    }

    setUploadingSig(true);
    try {
      const url = await uploadSignature(blob, ticket.id, sigType);
      const sigUpdate: Partial<ShiftTicket> = sigType === "contractor"
        ? {
            contractor_rep_signature_url: url,
            contractor_rep_signed_at: new Date().toISOString(),
          }
        : {
            supervisor_signature_url: url,
            supervisor_signed_at: new Date().toISOString(),
          };

      if (sigType === "contractor") setContractorSigUrl(url);
      else setSupervisorSigUrl(url);

      await Promise.resolve(onSave(sigUpdate));
      toast.success("Signature saved");
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setUploadingSig(false);
    }
  };

  // Upload pending sigs once ticket has an ID, then persist URLs to DB
  useEffect(() => {
    if (!ticket?.id || Object.keys(pendingSigs).length === 0) return;
    const uploadPending = async () => {
      setUploadingSig(true);
      const sigUpdates: Partial<ShiftTicket> = {};

      for (const [sigType, blob] of Object.entries(pendingSigs)) {
        try {
          const url = await uploadSignature(blob, ticket.id!, sigType as "contractor" | "supervisor");
          if (sigType === "contractor") {
            setContractorSigUrl(url);
            sigUpdates.contractor_rep_signature_url = url;
            sigUpdates.contractor_rep_signed_at = new Date().toISOString();
          } else {
            setSupervisorSigUrl(url);
            sigUpdates.supervisor_signature_url = url;
            sigUpdates.supervisor_signed_at = new Date().toISOString();
          }
        } catch {
          toast.error(`Failed to upload ${sigType} signature`);
        }
      }

      setPendingSigs({});

      try {
        if (Object.keys(sigUpdates).length > 0) {
          await Promise.resolve(onSave(sigUpdates));
        }
        toast.success("Signatures uploaded");
      } catch {
        toast.error("Failed to attach uploaded signatures to this shift ticket");
      } finally {
        setUploadingSig(false);
      }
    };

    uploadPending();
  }, [ticket?.id, pendingSigs, onSave]);

  const updateEquipment = (i: number, entry: EquipmentEntry) => {
    const next = [...equipmentEntries];
    next[i] = entry;
    setEquipmentEntries(next);
  };
  const removeEquipment = (i: number) => setEquipmentEntries(equipmentEntries.filter((_, idx) => idx !== i));

  const updatePersonnel = (i: number, entry: PersonnelEntry) => {
    const next = [...personnelEntries];
    next[i] = entry;
    setPersonnelEntries(next);
  };
  const removePersonnel = (i: number) => setPersonnelEntries(personnelEntries.filter((_, idx) => idx !== i));

  return (
    <AppShell title="Shift Ticket">
      <div className="px-4 pt-3 pb-40 space-y-5 overflow-x-hidden">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-base font-extrabold truncate">OF-297 Shift Ticket</h2>
          {ticket?.status === "draft" && (
            <span className="shrink-0 rounded-full bg-warning/20 text-warning px-2 py-0.5 text-[10px] font-bold">DRAFT</span>
          )}
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <p className="text-[11px] text-warning font-medium">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Header Fields ── */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold">Header Info</h3>
          <div className="space-y-2">
            <div>
              <label className={labelClass}>1. Agreement / Contract #</label>
              <input value={agreementNumber} onChange={(e) => setAgreementNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>2. Contractor Name</label>
              <input value={contractorName} onChange={(e) => setContractorName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>3. Resource Order #</label>
              <input value={resourceOrderNumber} onChange={(e) => setResourceOrderNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>4. Incident Name</label>
              <input value={incidentName} onChange={(e) => setIncidentName(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>5. Incident #</label>
                <input value={incidentNumber} onChange={(e) => setIncidentNumber(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>6. Financial Code</label>
                <input value={financialCode} onChange={(e) => setFinancialCode(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Equipment Info ── */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold">Equipment Info</h3>
          <div className="space-y-2">
            <div>
              <label className={labelClass}>7. Equipment Make/Model</label>
              <input value={equipmentMakeModel} onChange={(e) => setEquipmentMakeModel(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>8. Equipment Type</label>
              <input value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>9. Serial/VIN</label>
                <input value={serialVin} onChange={(e) => setSerialVin(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>10. License/ID</label>
                <input value={licenseId} onChange={(e) => setLicenseId(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Options ── */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold">Options</h3>
          <label className="flex items-center gap-3 touch-target">
            <input type="checkbox" checked={transportRetained} onChange={(e) => setTransportRetained(e.target.checked)} className="h-5 w-5 rounded border-input accent-primary" />
            <span className="text-sm">12. Transport Retained</span>
          </label>
          <label className="flex items-center gap-3 touch-target">
            <input type="checkbox" checked={isFirstLast} onChange={(e) => setIsFirstLast(e.target.checked)} className="h-5 w-5 rounded border-input accent-primary" />
            <span className="text-sm">13. First/Last Ticket</span>
          </label>
          {isFirstLast && (
            <div className="grid grid-cols-2 gap-2 pl-8">
              {(["mobilization", "demobilization"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setFirstLastType(t)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium capitalize touch-target ${firstLastType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <div>
            <label className={labelClass}>14. Miles</label>
            <input type="number" inputMode="decimal" value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="0" className={inputClass} />
          </div>
        </section>

        {/* ── Equipment Entries ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Equipment</h3>
            <button onClick={() => setEquipmentEntries([...equipmentEntries, emptyEquipmentEntry()])}
              className="flex items-center gap-1 text-xs font-bold text-primary touch-target">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          </div>
          {equipmentEntries.map((entry, i) => (
            <EquipmentEntryRow key={i} entry={entry} index={i} onChange={updateEquipment} onRemove={removeEquipment} />
          ))}
        </section>

        {/* ── Personnel Entries ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Personnel</h3>
            <button onClick={() => setPersonnelEntries([...personnelEntries, emptyPersonnelEntry()])}
              className="flex items-center gap-1 text-xs font-bold text-primary touch-target">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          </div>

          {/* Bulk time entry */}
          {personnelEntries.length > 1 && (
            <BulkTimeEntry personnelEntries={personnelEntries} setPersonnelEntries={setPersonnelEntries} />
          )}

          {crewRoster && crewRoster.length > 0 && personnelEntries.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {crewRoster.length} crew member{crewRoster.length !== 1 ? "s" : ""} auto-loaded from truck assignment
            </p>
          )}
          {personnelEntries.map((entry, i) => (
            <PersonnelEntryRow key={i} entry={entry} index={i} onChange={updatePersonnel} onRemove={removePersonnel} />
          ))}
        </section>

        {/* ── Remarks ── */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold">30. Remarks</h3>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}
            placeholder="Equipment breakdown, operating issues..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
        </section>

        {/* ── Signatures ── */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold">Signatures</h3>

          {/* Contractor */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <label className={labelClass}>31. Contractor Rep (Printed Name)</label>
            <input value={contractorRepName} onChange={(e) => setContractorRepName(e.target.value)} className={inputClass} />
            <label className={labelClass}>32. Signature</label>
            {contractorSigUrl ? (
              <div className="space-y-2">
                <img src={contractorSigUrl} alt="Contractor signature" className="h-16 rounded border border-border bg-card" />
                <button onClick={() => setContractorSigUrl(null)} className="text-xs text-destructive touch-target">Clear</button>
              </div>
            ) : (
              <button onClick={() => setSigModal("contractor")} disabled={uploadingSig}
                className="w-full rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground touch-target disabled:opacity-40">
                Tap to sign
              </button>
            )}
          </div>

          {/* Supervisor */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <label className={labelClass}>33. Incident Supervisor (Name & RO#)</label>
            <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="Name" className={inputClass} />
            <input value={supervisorRO} onChange={(e) => setSupervisorRO(e.target.value)} placeholder="Resource Order #" className={inputClass} />
            <label className={labelClass}>34. Signature</label>
            {supervisorSigUrl ? (
              <div className="space-y-2">
                <img src={supervisorSigUrl} alt="Supervisor signature" className="h-16 rounded border border-border bg-card" />
                <button onClick={() => setSupervisorSigUrl(null)} className="text-xs text-destructive touch-target">Clear</button>
              </div>
            ) : (
              <button onClick={() => setSigModal("supervisor")} disabled={uploadingSig}
                className="w-full rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground touch-target disabled:opacity-40">
                Tap to sign
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── Bottom Action Bar (above BottomNav) ── */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md p-3 flex gap-2 z-40">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        {ticket?.id && (
          <button onClick={() => onExportPdf({ contractor_rep_signature_url: contractorSigUrl, supervisor_signature_url: supervisorSigUrl })} disabled={exportingPdf}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
            {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </button>
        )}
      </div>

      {/* Signature modal */}
      <SignatureCanvas
        open={sigModal !== null}
        onClose={() => setSigModal(null)}
        onSave={handleSignatureSave}
        title={sigModal === "contractor" ? "Contractor Signature" : "Supervisor Signature"}
      />
    </AppShell>
  );
}

/* ── Bulk Time Entry Component ── */
function BulkTimeEntry({
  personnelEntries,
  setPersonnelEntries,
}: {
  personnelEntries: PersonnelEntry[];
  setPersonnelEntries: React.Dispatch<React.SetStateAction<PersonnelEntry[]>>;
}) {
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkOpStart, setBulkOpStart] = useState("");
  const [bulkOpStop, setBulkOpStop] = useState("");
  const [bulkSbStart, setBulkSbStart] = useState("");
  const [bulkSbStop, setBulkSbStop] = useState("");
  const [bulkActivity, setBulkActivity] = useState<"travel" | "work">("work");
  const [bulkWorkContext, setBulkWorkContext] = useState("");
  const [bulkLodging, setBulkLodging] = useState(false);
  const [bulkPerDiemB, setBulkPerDiemB] = useState(false);
  const [bulkPerDiemL, setBulkPerDiemL] = useState(false);
  const [bulkPerDiemD, setBulkPerDiemD] = useState(false);

  const applyToAll = () => {
    const updated = personnelEntries.map((entry) => {
      const opHours = computeHours(bulkOpStart, bulkOpStop);
      const sbHours = computeHours(bulkSbStart, bulkSbStop);
      const newEntry: PersonnelEntry = {
        ...entry,
        date: bulkDate || entry.date,
        op_start: bulkOpStart || entry.op_start,
        op_stop: bulkOpStop || entry.op_stop,
        sb_start: bulkSbStart || entry.sb_start,
        sb_stop: bulkSbStop || entry.sb_stop,
        total: Math.round(((bulkOpStart && bulkOpStop ? opHours : computeHours(entry.op_start, entry.op_stop)) + (bulkSbStart && bulkSbStop ? sbHours : computeHours(entry.sb_start, entry.sb_stop))) * 10) / 10,
        activity_type: bulkActivity,
        work_context: bulkActivity === "work" ? bulkWorkContext : "",
        lodging: bulkLodging,
        per_diem_b: bulkPerDiemB,
        per_diem_l: bulkPerDiemL,
        per_diem_d: bulkPerDiemD,
      };
      newEntry.remarks = buildRemarksString(newEntry);
      return newEntry;
    });
    setPersonnelEntries(updated);
    toast.success(`Applied times to ${updated.length} crew members`);
  };

  const bulkInput = "w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-primary">Apply to All Crew</span>
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Date</label>
          <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className={bulkInput} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Op Start (24h)</label>
            <MilitaryTimeInput value={bulkOpStart} onChange={setBulkOpStart} className={bulkInput} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Op Stop (24h)</label>
            <MilitaryTimeInput value={bulkOpStop} onChange={setBulkOpStop} className={bulkInput} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">SB Start (24h)</label>
            <MilitaryTimeInput value={bulkSbStart} onChange={setBulkSbStart} className={bulkInput} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">SB Stop (24h)</label>
            <MilitaryTimeInput value={bulkSbStop} onChange={setBulkSbStop} className={bulkInput} />
          </div>
        </div>

        {/* Activity type */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setBulkActivity("travel")}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${bulkActivity === "travel" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Travel/Check-In
          </button>
          <button type="button" onClick={() => setBulkActivity("work")}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${bulkActivity === "work" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Work
          </button>
        </div>

        {/* Lodging */}
        <label className="flex items-center gap-2 touch-target">
          <input type="checkbox" checked={bulkLodging} onChange={(e) => setBulkLodging(e.target.checked)}
            className="h-5 w-5 rounded border-input accent-primary" />
          <span className="text-sm">Lodging</span>
        </label>

        {/* Per Diem */}
        <div className="flex gap-3">
          <span className="text-[10px] text-muted-foreground self-center">Per Diem:</span>
          <label className="flex items-center gap-1.5 touch-target">
            <input type="checkbox" checked={bulkPerDiemB} onChange={(e) => setBulkPerDiemB(e.target.checked)}
              className="h-5 w-5 rounded border-input accent-primary" />
            <span className="text-sm font-medium">B</span>
          </label>
          <label className="flex items-center gap-1.5 touch-target">
            <input type="checkbox" checked={bulkPerDiemL} onChange={(e) => setBulkPerDiemL(e.target.checked)}
              className="h-5 w-5 rounded border-input accent-primary" />
            <span className="text-sm font-medium">L</span>
          </label>
          <label className="flex items-center gap-1.5 touch-target">
            <input type="checkbox" checked={bulkPerDiemD} onChange={(e) => setBulkPerDiemD(e.target.checked)}
              className="h-5 w-5 rounded border-input accent-primary" />
            <span className="text-sm font-medium">D</span>
          </label>
        </div>
      </div>
      <button type="button" onClick={applyToAll}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground touch-target active:scale-[0.98]">
        <Clock className="h-4 w-4" />
        Apply to All ({personnelEntries.length})
      </button>
    </div>
  );
}
