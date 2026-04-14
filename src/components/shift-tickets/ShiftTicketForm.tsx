import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Loader2, FileText, Save, Download, AlertTriangle, Copy } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getLocalDateString } from "@/lib/local-date";
import { AppShell } from "@/components/AppShell";
import { SignaturePicker } from "./SignaturePicker";
import type { SignatureMetadata } from "./SignaturePicker";
import { EquipmentEntryRow } from "./EquipmentEntryRow";
import { PersonnelEntryRow } from "./PersonnelEntryRow";
import { CrewSyncCard } from "./CrewSyncCard";
import { OF297FormPreview } from "./OF297FormPreview";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { uploadSignature, computeHours, buildRemarksString, insertSignatureAuditLog } from "@/services/shift-tickets";
import type { ShiftTicket, EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";
import type { IncidentTruckCrewWithMember } from "@/services/incident-truck-crew";

interface ShiftTicketFormProps {
  ticket: Partial<ShiftTicket> | null;
  incidentTruckId: string;
  organizationId: string;
  saving: boolean;
  onSave: (data: Partial<ShiftTicket>) => void | Promise<void>;
  onExportPdf: (sigOverrides: { contractor_rep_signature_url: string | null; supervisor_signature_url: string | null }) => void;
  onDuplicate?: () => void;
  duplicating?: boolean;
  onBack?: () => void;
  exportingPdf?: boolean;
  warnings?: string[];
  crewRoster?: IncidentTruckCrewWithMember[];
}

const emptyEquipmentEntry = (): EquipmentEntry => ({
  date: getLocalDateString(),
  start: "",
  stop: "",
  total: 0,
  quantity: "1",
  type: "Day",
  remarks: "",
});

const emptyPersonnelEntry = (): PersonnelEntry => ({
  date: getLocalDateString(),
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
  onDuplicate,
  duplicating,
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

  // Collapsible personnel
  const [expandedPersonnelIndex, setExpandedPersonnelIndex] = useState<number | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<"header" | "equipment" | "options" | "remarks" | null>(null);

  // Supervisor sheet
  const [showSupervisorSheet, setShowSupervisorSheet] = useState(false);

  // ── Dirty tracking & auto-save ──
  const [isDirty, setIsDirty] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Success overlay ──
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
  }, []);

  const markDirty = useCallback(() => {
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  // Browser beforeunload guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Auto-save draft 3 seconds after first edit (new tickets only)
  useEffect(() => {
    if (!isDirty || hasAutoSaved || ticket?.id) return;
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
      setHasAutoSaved(true);
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, hasAutoSaved, ticket?.id]);

  // Navigation guard state (replaces useBlocker which requires data router)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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

  const buildSavePayload = (): Partial<ShiftTicket> => {
    const persistedContractorSigUrl = getPersistedSignatureUrl(contractorSigUrl);
    const persistedSupervisorSigUrl = getPersistedSignatureUrl(supervisorSigUrl);
    return {
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
    };
  };

  const handleSave = async (silent = false) => {
    try {
      await Promise.resolve(onSave(buildSavePayload()));
      setIsDirty(false);
      if (!silent) showSuccess("Saved");
    } catch {
      // Error handled by parent
    }
  };

  const handleSignatureSave = async (blob: Blob, metadata: SignatureMetadata, sigTypeOverride?: "contractor" | "supervisor") => {
    const sigType = sigTypeOverride || sigModal;
    if (!sigType) return;
    setSigModal(null);

    if (!ticket?.id) {
      const localUrl = URL.createObjectURL(blob);
      if (sigType === "contractor") setContractorSigUrl(localUrl);
      else setSupervisorSigUrl(localUrl);
      setPendingSigs((prev) => ({ ...prev, [sigType]: blob }));
      markDirty();
      showSuccess("Signature captured");
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

      await insertSignatureAuditLog({
        shift_ticket_id: ticket.id,
        organization_id: organizationId || null,
        signer_type: sigType,
        signer_name: sigType === "contractor" ? contractorRepName : supervisorName,
        signature_url: url,
        method: metadata.method,
        font_used: metadata.font || null,
      });

      await Promise.resolve(onSave({ ...buildSavePayload(), ...sigUpdate }));
      setIsDirty(false);
      showSuccess("Signature saved");
    } catch {
      showSuccess("Failed to save signature");
    } finally {
      setUploadingSig(false);
    }
  };

  // Upload pending sigs once ticket has an ID
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
          // Silently fail individual sig uploads
        }
      }

      setPendingSigs({});

      try {
        if (Object.keys(sigUpdates).length > 0) {
          await Promise.resolve(onSave({ ...buildSavePayload(), ...sigUpdates }));
          setIsDirty(false);
        }
        showSuccess("Signatures uploaded");
      } catch {
        // Error handled by parent
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
    markDirty();
  };
  const removeEquipment = (i: number) => { setEquipmentEntries(equipmentEntries.filter((_, idx) => idx !== i)); markDirty(); };

  const updatePersonnel = (i: number, entry: PersonnelEntry) => {
    const next = [...personnelEntries];
    next[i] = entry;
    setPersonnelEntries(next);
    markDirty();
  };
  const removePersonnel = (i: number) => { setPersonnelEntries(personnelEntries.filter((_, idx) => idx !== i)); markDirty(); };

  // Dirty-tracking wrappers for header fields
  const setField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (val: T) => {
    setter(val);
    markDirty();
  };

  return (
    <AppShell title="Shift Ticket" onBack={() => isDirty ? setShowLeaveDialog(true) : onBack?.()}>
      <div className="px-4 pt-3 pb-40 space-y-5" style={{ overflowX: 'clip' }}>
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

        {/* ── Chip row for secondary info ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {([
            { key: "header" as const, label: "Header", hasData: !!(incidentName || agreementNumber || contractorName) },
            { key: "equipment" as const, label: "Equipment", hasData: !!(equipmentMakeModel || equipmentType || licenseId) },
            { key: "options" as const, label: "Options", hasData: !!(transportRetained || isFirstLast || miles) },
            { key: "remarks" as const, label: "Remarks", hasData: !!remarks },
          ]).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveDrawer(chip.key)}
              className="relative shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground touch-target active:bg-accent/40 transition-colors"
            >
              {chip.label}
              {chip.hasData && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* ── Drawers for each chip ── */}
        <Drawer open={activeDrawer === "header"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Header Info</DrawerTitle></DrawerHeader>
            <div className="px-4 pb-2 space-y-2">
              <div>
                <label className={labelClass}>1. Agreement / Contract #</label>
                <input value={agreementNumber} onChange={(e) => setField(setAgreementNumber)(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>2. Contractor Name</label>
                <input value={contractorName} onChange={(e) => setField(setContractorName)(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>3. Resource Order #</label>
                <input value={resourceOrderNumber} onChange={(e) => setField(setResourceOrderNumber)(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>4. Incident Name</label>
                <input value={incidentName} onChange={(e) => setField(setIncidentName)(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>5. Incident #</label>
                  <input value={incidentNumber} onChange={(e) => setField(setIncidentNumber)(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>6. Financial Code</label>
                  <input value={financialCode} onChange={(e) => setField(setFinancialCode)(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => setActiveDrawer(null)}>Done</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer open={activeDrawer === "equipment"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Equipment Info</DrawerTitle></DrawerHeader>
            <div className="px-4 pb-2 space-y-2">
              <div>
                <label className={labelClass}>7. Equipment Make/Model</label>
                <input value={equipmentMakeModel} onChange={(e) => setField(setEquipmentMakeModel)(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>8. Equipment Type</label>
                <input value={equipmentType} onChange={(e) => setField(setEquipmentType)(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>9. Serial/VIN</label>
                  <input value={serialVin} onChange={(e) => setField(setSerialVin)(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>10. License/ID</label>
                  <input value={licenseId} onChange={(e) => setField(setLicenseId)(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => setActiveDrawer(null)}>Done</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer open={activeDrawer === "options"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Options</DrawerTitle></DrawerHeader>
            <div className="px-4 pb-2 space-y-2">
              <label className="flex items-center gap-3 touch-target">
                <input type="checkbox" checked={transportRetained} onChange={(e) => { setTransportRetained(e.target.checked); markDirty(); }} className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm">12. Transport Retained</span>
              </label>
              <label className="flex items-center gap-3 touch-target">
                <input type="checkbox" checked={isFirstLast} onChange={(e) => { setIsFirstLast(e.target.checked); markDirty(); }} className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm">13. First/Last Ticket</span>
              </label>
              {isFirstLast && (
                <div className="grid grid-cols-2 gap-2 pl-8">
                  {(["mobilization", "demobilization"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => { setFirstLastType(t); markDirty(); }}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium capitalize touch-target ${firstLastType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <label className={labelClass}>14. Miles</label>
                <input type="number" inputMode="decimal" value={miles} onChange={(e) => setField(setMiles)(e.target.value)} placeholder="0" className={inputClass} />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => setActiveDrawer(null)}>Done</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer open={activeDrawer === "remarks"} onOpenChange={(open) => !open && setActiveDrawer(null)}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>30. Remarks</DrawerTitle></DrawerHeader>
            <div className="px-4 pb-2">
              <textarea value={remarks} onChange={(e) => { setRemarks(e.target.value); markDirty(); }} rows={4}
                placeholder="Equipment breakdown, operating issues..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <DrawerFooter>
              <Button onClick={() => setActiveDrawer(null)}>Done</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* ── Equipment Time Entries ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Equipment Time</h3>
            <button type="button" onClick={() => { setEquipmentEntries((prev) => [...prev, emptyEquipmentEntry()]); markDirty(); }}
              className="flex items-center gap-1 text-xs font-medium text-primary touch-target">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          </div>
          {equipmentEntries.map((entry, i) => (
            <EquipmentEntryRow key={i} entry={entry} index={i}
              onChange={(idx, updated) => { setEquipmentEntries((prev) => prev.map((e, j) => (j === idx ? updated : e))); markDirty(); }}
              onRemove={(idx) => { if (equipmentEntries.length > 1) { setEquipmentEntries((prev) => prev.filter((_, j) => j !== idx)); markDirty(); } }}
            />
          ))}
        </section>

        {/* ── Crew Sync ── */}
        <CrewSyncCard
          equipmentEntries={equipmentEntries}
          personnelEntries={personnelEntries}
          setPersonnelEntries={(updater) => { setPersonnelEntries(updater); markDirty(); }}
        />

        {/* ── Personnel Entries ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Crew ({personnelEntries.length})</h3>
            <button type="button" onClick={() => { setPersonnelEntries((prev) => [...prev, emptyPersonnelEntry()]); markDirty(); }}
              className="flex items-center gap-1 text-xs font-medium text-primary touch-target">
              <Plus className="h-3.5 w-3.5" /> Add Crew
            </button>
          </div>
          {personnelEntries.map((entry, i) => (
            <PersonnelEntryRow key={i} entry={entry} index={i}
              collapsed={expandedPersonnelIndex !== i}
              onToggle={() => setExpandedPersonnelIndex(expandedPersonnelIndex === i ? null : i)}
              onChange={(idx, updated) => { setPersonnelEntries((prev) => prev.map((e, j) => (j === idx ? updated : e))); markDirty(); }}
              onRemove={(idx) => { if (personnelEntries.length > 1) { setPersonnelEntries((prev) => prev.filter((_, j) => j !== idx)); markDirty(); } }}
            />
          ))}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold">Signatures</h3>

          {/* Contractor */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <label className={labelClass}>31. Contractor Rep (Printed Name)</label>
            <input value={contractorRepName} onChange={(e) => setField(setContractorRepName)(e.target.value)} className={inputClass} />
            <label className={labelClass}>32. Signature</label>
            {contractorSigUrl ? (
              <div className="space-y-2">
                <img src={contractorSigUrl} alt="Contractor signature" className="h-16 rounded border border-border bg-card" />
                <button onClick={() => { setContractorSigUrl(null); markDirty(); }} className="text-xs text-destructive touch-target">Clear</button>
              </div>
            ) : (
              <button onClick={() => setSigModal("contractor")} disabled={uploadingSig}
                className="w-full rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground touch-target disabled:opacity-40">
                Tap to sign
              </button>
            )}
          </div>

          {/* Supervisor — opens OF-297 PDF view */}
          <button
            type="button"
            onClick={() => setShowSupervisorSheet(true)}
            className="w-full rounded-xl border border-border bg-card p-3 space-y-2 text-left touch-target active:bg-accent/30"
          >
            <span className={labelClass}>33. Incident Supervisor (Name & RO#)</span>
            <p className="text-sm font-medium truncate">
              {supervisorName || <span className="text-muted-foreground">Tap to enter name</span>}
            </p>
            {supervisorRO && (
              <p className="text-xs text-muted-foreground truncate">RO# {supervisorRO}</p>
            )}
            <span className={labelClass}>34. Signature</span>
            {supervisorSigUrl ? (
              <img src={supervisorSigUrl} alt="Supervisor signature" className="h-12 rounded border border-border bg-card" />
            ) : (
              <p className="text-xs text-muted-foreground italic">No signature yet</p>
            )}
          </button>
        </section>
      </div>

      {/* ── Bottom Action Bar (above BottomNav) ── */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md p-3 flex gap-2 z-40">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        {ticket?.id && (
          <>
            <button onClick={() => onExportPdf({ contractor_rep_signature_url: contractorSigUrl, supervisor_signature_url: supervisorSigUrl })} disabled={exportingPdf}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </button>
            {onDuplicate && (
              <button onClick={onDuplicate} disabled={duplicating}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
                {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Dup
              </button>
            )}
          </>
        )}
      </div>

      {/* Signature modal */}
      <SignaturePicker
        open={sigModal !== null}
        onClose={() => setSigModal(null)}
        onSave={handleSignatureSave}
        title={sigModal === "contractor" ? "Contractor Signature" : "Supervisor Signature"}
        defaultName={sigModal === "contractor" ? contractorRepName : supervisorName}
      />

      {/* OF-297 PDF view for supervisor signing */}
      {showSupervisorSheet && (
        <OF297FormPreview
          ticket={{
            agreement_number: agreementNumber,
            contractor_name: contractorName,
            resource_order_number: resourceOrderNumber,
            incident_name: incidentName,
            incident_number: incidentNumber,
            financial_code: financialCode,
            equipment_make_model: equipmentMakeModel,
            equipment_type: equipmentType,
            serial_vin_number: serialVin,
            license_id_number: licenseId,
            transport_retained: transportRetained,
            is_first_last: isFirstLast,
            first_last_type: firstLastType,
            miles: miles ? parseFloat(miles) : null,
            equipment_entries: equipmentEntries as any,
            personnel_entries: personnelEntries as any,
            remarks,
            contractor_rep_name: contractorRepName,
          }}
          contractorSigUrl={contractorSigUrl}
          supervisorSigUrl={supervisorSigUrl}
          supervisorName={supervisorName}
          supervisorRO={supervisorRO}
          onSupervisorNameChange={(v) => { setSupervisorName(v); markDirty(); }}
          onSupervisorROChange={(v) => { setSupervisorRO(v); markDirty(); }}
          onTapToSign={() => setSigModal("supervisor")}
          onClearSignature={() => { setSupervisorSigUrl(null); markDirty(); }}
          onClose={() => setShowSupervisorSheet(false)}
          uploadingSig={uploadingSig}
        />
      )}

      {/* Unsaved changes guard */}
      <UnsavedChangesDialog
        open={showLeaveDialog}
        onStay={() => setShowLeaveDialog(false)}
        onLeave={() => { setShowLeaveDialog(false); setIsDirty(false); onBack?.(); }}
      />

      {/* Success overlay (replaces toast) */}
      <SuccessOverlay
        message={successMsg || ""}
        show={!!successMsg}
        onDone={() => setSuccessMsg(null)}
      />
    </AppShell>
  );
}
