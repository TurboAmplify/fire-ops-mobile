import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Loader2, FileText, Save, Download, AlertTriangle, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SignatureCanvas } from "./SignatureCanvas";
import { EquipmentEntryRow } from "./EquipmentEntryRow";
import { PersonnelEntryRow } from "./PersonnelEntryRow";
import { uploadSignature, computeHours } from "@/services/shift-tickets";
import type { ShiftTicket, EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";
import type { IncidentTruckCrewWithMember } from "@/services/incident-truck-crew";

interface ShiftTicketFormProps {
  ticket: Partial<ShiftTicket> | null;
  incidentTruckId: string;
  organizationId: string;
  saving: boolean;
  onSave: (data: Partial<ShiftTicket>) => void;
  onExportPdf: () => void;
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
  remarks: "",
});

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
    setContractorSigUrl(ticket.contractor_rep_signature_url || null);
    setSupervisorName(ticket.supervisor_name || "");
    setSupervisorRO(ticket.supervisor_resource_order || "");
    setSupervisorSigUrl(ticket.supervisor_signature_url || null);
  }, [ticket]);

  const handleSave = () => {
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
      contractor_rep_signature_url: contractorSigUrl,
      contractor_rep_signed_at: contractorSigUrl ? new Date().toISOString() : null,
      supervisor_name: supervisorName || null,
      supervisor_resource_order: supervisorRO || null,
      supervisor_signature_url: supervisorSigUrl,
      supervisor_signed_at: supervisorSigUrl ? new Date().toISOString() : null,
      status: "draft",
    });
  };

  const handleSignatureSave = async (blob: Blob) => {
    if (!ticket?.id || !sigModal) return;
    setUploadingSig(true);
    try {
      const url = await uploadSignature(blob, ticket.id, sigModal);
      if (sigModal === "contractor") setContractorSigUrl(url);
      else setSupervisorSigUrl(url);
      toast.success("Signature saved");
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setUploadingSig(false);
      setSigModal(null);
    }
  };

  const updateEquipment = (i: number, entry: EquipmentEntry) => {
    const next = [...equipmentEntries];
    next[i] = entry;
    setEquipmentEntries(next);
  };

  const removeEquipment = (i: number) => {
    setEquipmentEntries(equipmentEntries.filter((_, idx) => idx !== i));
  };

  const updatePersonnel = (i: number, entry: PersonnelEntry) => {
    const next = [...personnelEntries];
    next[i] = entry;
    setPersonnelEntries(next);
  };

  const removePersonnel = (i: number) => {
    setPersonnelEntries(personnelEntries.filter((_, idx) => idx !== i));
  };

  const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target";
  const labelClass = "text-xs font-medium text-muted-foreground";

  return (
    <AppShell
      title=""
      headerRight={
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-primary touch-target">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="p-4 pb-32 space-y-5">
        {/* Title */}
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">OF-297 Shift Ticket</h2>
        </div>
        {ticket?.status === "draft" && (
          <span className="inline-block rounded-full bg-warning/20 text-warning px-2.5 py-0.5 text-xs font-bold">DRAFT</span>
        )}

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning font-medium">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Header Fields */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold">Header Info</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>1. Agreement #</label><input value={agreementNumber} onChange={(e) => setAgreementNumber(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>2. Contractor</label><input value={contractorName} onChange={(e) => setContractorName(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>3. Resource Order #</label><input value={resourceOrderNumber} onChange={(e) => setResourceOrderNumber(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>4. Incident Name</label><input value={incidentName} onChange={(e) => setIncidentName(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>5. Incident #</label><input value={incidentNumber} onChange={(e) => setIncidentNumber(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>6. Financial Code</label><input value={financialCode} onChange={(e) => setFinancialCode(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>7. Equipment Make/Model</label><input value={equipmentMakeModel} onChange={(e) => setEquipmentMakeModel(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>8. Equipment Type</label><input value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>9. Serial/VIN</label><input value={serialVin} onChange={(e) => setSerialVin(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>10. License/ID</label><input value={licenseId} onChange={(e) => setLicenseId(e.target.value)} className={inputClass} /></div>
          </div>
        </section>

        {/* Flags */}
        <section className="space-y-3">
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

        {/* Equipment Entries */}
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

        {/* Personnel Entries */}
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
            <BulkTimeEntry
              personnelEntries={personnelEntries}
              setPersonnelEntries={setPersonnelEntries}
            />
          )}

          {/* Crew roster info */}
          {crewRoster && crewRoster.length > 0 && personnelEntries.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {crewRoster.length} crew member{crewRoster.length !== 1 ? "s" : ""} auto-loaded from truck assignment
            </p>
          )}
          {personnelEntries.map((entry, i) => (
            <PersonnelEntryRow key={i} entry={entry} index={i} onChange={updatePersonnel} onRemove={removePersonnel} />
          ))}
        </section>

        {/* Remarks */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold">30. Remarks</h3>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}
            placeholder="Equipment breakdown, operating issues..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
        </section>

        {/* Signatures */}
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
                <button onClick={() => { setContractorSigUrl(null); }} className="text-xs text-destructive touch-target">Clear</button>
              </div>
            ) : (
              <button onClick={() => setSigModal("contractor")} disabled={!ticket?.id || uploadingSig}
                className="w-full rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground touch-target disabled:opacity-40">
                Tap to sign
              </button>
            )}
          </div>

          {/* Supervisor */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <label className={labelClass}>33. Incident Supervisor (Name & RO#)</label>
            <div className="grid grid-cols-2 gap-2">
              <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="Name" className={inputClass} />
              <input value={supervisorRO} onChange={(e) => setSupervisorRO(e.target.value)} placeholder="RO #" className={inputClass} />
            </div>
            <label className={labelClass}>34. Signature</label>
            {supervisorSigUrl ? (
              <div className="space-y-2">
                <img src={supervisorSigUrl} alt="Supervisor signature" className="h-16 rounded border border-border bg-card" />
                <button onClick={() => { setSupervisorSigUrl(null); }} className="text-xs text-destructive touch-target">Clear</button>
              </div>
            ) : (
              <button onClick={() => setSigModal("supervisor")} disabled={!ticket?.id || uploadingSig}
                className="w-full rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground touch-target disabled:opacity-40">
                Tap to sign
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 glass safe-area-bottom p-4 flex gap-2 z-40">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        {ticket?.id && (
          <button onClick={onExportPdf} disabled={exportingPdf}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
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

  const applyToAll = () => {
    const updated = personnelEntries.map((entry) => {
      const opHours = computeHours(bulkOpStart, bulkOpStop);
      const sbHours = computeHours(bulkSbStart, bulkSbStop);
      return {
        ...entry,
        date: bulkDate || entry.date,
        op_start: bulkOpStart || entry.op_start,
        op_stop: bulkOpStop || entry.op_stop,
        sb_start: bulkSbStart || entry.sb_start,
        sb_stop: bulkSbStop || entry.sb_stop,
        total: Math.round(((bulkOpStart && bulkOpStop ? opHours : computeHours(entry.op_start, entry.op_stop)) + (bulkSbStart && bulkSbStop ? sbHours : computeHours(entry.sb_start, entry.sb_stop))) * 10) / 10,
      };
    });
    setPersonnelEntries(updated);
  };

  const inputClass = "w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-primary">Apply Time to All Crew</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Date</label>
          <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className={inputClass} />
        </div>
        <div />
        <div>
          <label className="text-[10px] text-muted-foreground">Operating Start</label>
          <input type="time" value={bulkOpStart} onChange={(e) => setBulkOpStart(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Operating Stop</label>
          <input type="time" value={bulkOpStop} onChange={(e) => setBulkOpStop(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Standby Start</label>
          <input type="time" value={bulkSbStart} onChange={(e) => setBulkSbStart(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Standby Stop</label>
          <input type="time" value={bulkSbStop} onChange={(e) => setBulkSbStop(e.target.value)} className={inputClass} />
        </div>
      </div>
      <button
        type="button"
        onClick={applyToAll}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground touch-target active:scale-[0.98]"
      >
        <Clock className="h-4 w-4" />
        Apply to All ({personnelEntries.length}) Crew Members
      </button>
    </div>
  );
}
