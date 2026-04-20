import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, FileText, Save, Download, AlertTriangle, Copy, Lock, Unlock, RefreshCw, Info } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getLocalDateString } from "@/lib/local-date";
import { AppShell } from "@/components/AppShell";
import { useAvailableCrewMembers } from "@/hooks/useIncidentTruckCrew";
import { SignaturePicker } from "./SignaturePicker";
import type { SignatureMetadata } from "./SignaturePicker";
import { EquipmentEntryRow } from "./EquipmentEntryRow";
import { PersonnelEntryRow } from "./PersonnelEntryRow";
import { CrewSyncCard } from "./CrewSyncCard";
import { OF297FormPreview } from "./OF297FormPreview";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { SignedImage } from "@/components/ui/SignedImage";
import { uploadSignature, computeHours, buildRemarksString, insertSignatureAuditLog } from "@/services/shift-tickets";
import {
  diffTicket,
  hasAnySignature,
  insertAuditEntries,
  isLocked as auditIsLocked,
} from "@/services/shift-ticket-audit";
import { useAuth } from "@/hooks/useAuth";
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
  /** True when the signed-in user is an org admin. Required for unlocking a final ticket. */
  isAdmin?: boolean;
  /** Pull latest truck + RO data and overwrite blank fields. */
  onRefreshFromSources?: () => void | Promise<void>;
  /** Source data status for inline hints. */
  sourceHints?: {
    truckMissingVin?: boolean;
    truckMissingPlate?: boolean;
    roUnparsed?: boolean;
    hasResourceOrder?: boolean;
    autoParsingRo?: boolean;
    truckEditPath?: string;
    incidentPath?: string;
  };
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
  isAdmin = false,
  onRefreshFromSources,
  sourceHints,
}: ShiftTicketFormProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefreshFromSources) return;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefreshFromSources());
      toast.success("Refreshed from truck & resource order");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };
  const { user } = useAuth();
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
  const [showCrewPicker, setShowCrewPicker] = useState(false);

  // Supervisor sheet
  const [showSupervisorSheet, setShowSupervisorSheet] = useState(false);
  const { data: availableCrewMembers = [] } = useAvailableCrewMembers(organizationId || undefined);

  const selectedCrewNames = new Set(
    personnelEntries
      .map((entry) => entry.operator_name.trim().toLowerCase())
      .filter(Boolean)
  );

  const pickerOptions = [
    ...(crewRoster ?? [])
      .filter((member) => member.is_active)
      .map((member) => ({
        key: `assignment-${member.id}`,
        name: member.crew_members?.name || "",
        role: member.role_on_assignment || member.crew_members?.role || "",
        source: "Assigned to this truck",
      })),
    ...availableCrewMembers.map((member) => ({
      key: `member-${member.id}`,
      name: member.name || "",
      role: member.role || "",
      source: "Organization crew",
    })),
  ].filter((option, index, all) => {
    const normalizedName = option.name.trim().toLowerCase();
    if (!normalizedName || selectedCrewNames.has(normalizedName)) return false;
    return all.findIndex((candidate) => candidate.name.trim().toLowerCase() === normalizedName) === index;
  });

  // ── Dirty tracking & auto-save ──
  const [isDirty, setIsDirty] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Success overlay ──
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Lock & audit state ──
  // A ticket is locked once the supervisor signature is captured.
  // Admins can unlock with a written reason; the unlock + every subsequent
  // save are written to the immutable shift_ticket_audit table.
  const ticketLocked = !!ticket && auditIsLocked(ticket as Record<string, unknown>);
  const [unlockedThisSession, setUnlockedThisSession] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const editingLocked = ticketLocked && !unlockedThisSession;

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

  // M2-H1: Auto-save draft 3 seconds after first edit (new tickets only).
  // Use ref to always call latest handleSave without re-triggering effect.
  const handleSaveRef = useRef<(silent?: boolean) => Promise<void>>();
  useEffect(() => {
    if (!isDirty || hasAutoSaved || ticket?.id) return;
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveRef.current?.(true);
      setHasAutoSaved(true);
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [isDirty, hasAutoSaved, ticket?.id]);

  // Clear timer on unmount as a final safety net
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

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
    // Lock model: Final = supervisor signature captured. Contractor sig alone
    // keeps the ticket in Draft status. Re-locking happens automatically on
    // every save while the supervisor sig is still present.
    const isFinal = !!persistedSupervisorSigUrl;
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
      status: isFinal ? "final" : "draft",
    };
  };

  const writeAuditForSave = async (
    payload: Partial<ShiftTicket>,
    opts: { isOverrideEdit: boolean }
  ) => {
    if (!ticket?.id || !organizationId) return;
    // Only audit changes once a signature exists. Before any signature, the
    // ticket is considered editable working state.
    if (!hasAnySignature(ticket as Record<string, unknown>)) return;

    const diffs = diffTicket(
      ticket as Record<string, unknown>,
      payload as Record<string, unknown>
    );
    if (diffs.length === 0) return;

    const actor_user_id = user?.id ?? null;
    const actor_name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? user?.email ?? null;

    const entries = diffs.map((d) => ({
      shift_ticket_id: ticket.id!,
      organization_id: organizationId,
      event_type: opts.isOverrideEdit ? ("override_edit" as const) : d.event_type,
      field_name: d.field_name ?? null,
      old_value: d.old_value ?? null,
      new_value: d.new_value ?? null,
      reason: opts.isOverrideEdit ? unlockReason || null : null,
      actor_user_id,
      actor_name,
    }));

    await insertAuditEntries(entries);
  };

  const handleSave = async (silent = false) => {
    if (editingLocked) {
      toast.error("This ticket is locked. An admin must unlock it before saving changes.");
      return;
    }
    const payload = buildSavePayload();
    try {
      await writeAuditForSave(payload, { isOverrideEdit: !!unlockedThisSession });
      await Promise.resolve(onSave(payload));
      setIsDirty(false);

      // Re-lock automatically if supervisor sig is still present after save
      if (unlockedThisSession && payload.status === "final") {
        await insertAuditEntries([
          {
            shift_ticket_id: ticket!.id!,
            organization_id: organizationId,
            event_type: "relocked",
            actor_user_id: user?.id ?? null,
            actor_name:
              (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
              user?.email ??
              null,
          },
        ]);
        setUnlockedThisSession(false);
        setUnlockReason("");
      }

      if (!silent) showSuccess(payload.status === "final" ? "Saved & locked" : "Saved");
    } catch {
      // Error handled by parent
    }
  };

  const handleUnlockConfirm = async () => {
    if (!ticket?.id || !organizationId) return;
    if (unlockReason.trim().length < 4) {
      toast.error("Please enter a reason for unlocking (4+ characters)");
      return;
    }
    setUnlockSubmitting(true);
    try {
      await insertAuditEntries([
        {
          shift_ticket_id: ticket.id,
          organization_id: organizationId,
          event_type: "unlocked",
          reason: unlockReason.trim(),
          actor_user_id: user?.id ?? null,
          actor_name:
            (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
            user?.email ??
            null,
        },
      ]);
      setUnlockedThisSession(true);
      setShowUnlockDialog(false);
      showSuccess("Ticket unlocked for editing");
    } finally {
      setUnlockSubmitting(false);
    }
  };

  // Keep ref in sync so the auto-save effect always calls the latest handleSave.
  handleSaveRef.current = handleSave;

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
      // M2-H3: Show failure as an error toast, not the green success overlay.
      toast.error("Failed to save signature");
    } finally {
      setUploadingSig(false);
    }
  };

  // M2-H2: Upload pending sigs once ticket has an ID.
  // Use a ref for onSave so this effect doesn't retrigger on every parent re-render.
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
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
          await Promise.resolve(onSaveRef.current({ ...buildSavePayload(), ...sigUpdates }));
          setIsDirty(false);
        }
        showSuccess("Signatures uploaded");
      } catch {
        toast.error("Failed to upload signatures");
      } finally {
        setUploadingSig(false);
      }
    };

    uploadPending();
    // Intentionally exclude onSave/buildSavePayload — handled via ref to prevent re-trigger loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, pendingSigs]);

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
          {onRefreshFromSources && ticket?.id && !editingLocked && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh from Truck & Resource Order"
              className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground touch-target active:bg-accent/40 disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refresh
            </button>
          )}
        </div>

        {/* Source-data hints */}
        {sourceHints && (sourceHints.truckMissingVin || sourceHints.truckMissingPlate || sourceHints.roUnparsed || sourceHints.autoParsingRo) && !editingLocked && (
          <div className="space-y-1.5">
            {sourceHints.autoParsingRo && (
              <div className="flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/30 p-2.5">
                <Loader2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 animate-spin" />
                <p className="text-[11px] text-primary font-medium leading-snug">
                  Reading the resource order with AI… header fields will fill in automatically when it finishes.
                </p>
              </div>
            )}
            {(sourceHints.truckMissingVin || sourceHints.truckMissingPlate) && (
              <a
                href={sourceHints.truckEditPath || "#"}
                onClick={(e) => {
                  if (!sourceHints.truckEditPath) e.preventDefault();
                }}
                className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border p-2.5 active:bg-accent/40 transition-colors"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {sourceHints.truckMissingVin && sourceHints.truckMissingPlate
                    ? "Add the VIN and license plate on the truck profile to auto-fill these fields."
                    : sourceHints.truckMissingVin
                      ? "Add the VIN on the truck profile (or upload + tag a VIN photo) to auto-fill the VIN field."
                      : "Add the license plate on the truck profile to auto-fill the License/ID field."}
                  {sourceHints.truckEditPath && <span className="font-semibold text-primary"> Open truck →</span>}
                </p>
              </a>
            )}
            {sourceHints.roUnparsed && !sourceHints.autoParsingRo && (
              <a
                href={sourceHints.incidentPath || "#"}
                onClick={(e) => {
                  if (!sourceHints.incidentPath) e.preventDefault();
                }}
                className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border p-2.5 active:bg-accent/40 transition-colors"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {sourceHints.hasResourceOrder
                    ? "Resource order has not been parsed yet — open the incident and tap Parse on the resource order."
                    : "No resource order uploaded for this truck yet — upload one to auto-fill the header fields."}
                  {sourceHints.incidentPath && <span className="font-semibold text-primary"> Open incident →</span>}
                </p>
              </a>
            )}
          </div>
        )}

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

        {/* ── Combined Time + Crew Sync Card ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <section className="p-3 space-y-3">
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
          <div className="border-t border-border" />
          <div className="p-3">
            <CrewSyncCard
              equipmentEntries={equipmentEntries}
              personnelEntries={personnelEntries}
              setPersonnelEntries={(updater) => { setPersonnelEntries(updater); markDirty(); }}
            />
          </div>
        </div>

        {/* ── Crew (Personnel Entries) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Crew ({personnelEntries.length})
              {personnelEntries.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {Math.round(personnelEntries.reduce((sum, e) => sum + (e.total || 0), 0) * 10) / 10}h
                </span>
              )}
            </h3>
            <button type="button" onClick={() => {
              if (pickerOptions.length > 0 || availableCrewMembers.length > 0 || (crewRoster?.length ?? 0) > 0) {
                setShowCrewPicker(!showCrewPicker);
              } else {
                setPersonnelEntries((prev) => [...prev, emptyPersonnelEntry()]);
                markDirty();
              }
            }}
              className="flex items-center gap-1 text-xs font-medium text-primary touch-target">
              <Plus className="h-3.5 w-3.5" /> Add Crew
            </button>
          </div>

          {/* Crew roster picker */}
          {showCrewPicker && (pickerOptions.length > 0 || availableCrewMembers.length > 0 || (crewRoster?.length ?? 0) > 0) && (
            <div className="rounded-xl border border-border bg-card p-2 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground px-1">Select crew member</p>
              {pickerOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      const newEntry: PersonnelEntry = {
                        ...emptyPersonnelEntry(),
                        operator_name: option.name,
                      };
                      setPersonnelEntries((prev) => [...prev, newEntry]);
                      markDirty();
                      setShowCrewPicker(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg bg-secondary p-2.5 text-left active:bg-accent/40 touch-target"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                      {(() => {
                        const name = option.name;
                        const parts = name.trim().split(/\s+/);
                        return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{option.name}</p>
                      <p className="text-[11px] text-muted-foreground">{option.role || option.source}</p>
                    </div>
                  </button>
                ))}
              {pickerOptions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No more crew members available to add</p>
              )}
              <button
                type="button"
                onClick={() => { setPersonnelEntries((prev) => [...prev, emptyPersonnelEntry()]); markDirty(); setShowCrewPicker(false); }}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground touch-target"
              >
                <Plus className="h-3 w-3" /> Add manually
              </button>
            </div>
          )}
          {/* Compact initials grid */}
          <div className="flex flex-wrap gap-1.5">
            {personnelEntries.map((entry, i) => {
              const name = entry.operator_name || "";
              const parts = name.trim().split(/\s+/);
              const initials = parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : name.slice(0, 2).toUpperCase() || String(i + 1);
              const hasHours = (entry.total || 0) > 0;
              const isExpanded = expandedPersonnelIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpandedPersonnelIndex(isExpanded ? null : i)}
                  className={`w-9 h-9 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors touch-target ${
                    isExpanded
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : hasHours
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {initials}
                </button>
              );
            })}
          </div>
          {/* Compact status summary */}
          {personnelEntries.length > 0 && (() => {
            const first = personnelEntries[0];
            const tags: string[] = [];
            if (first.lodging) tags.push("Lodging");
            const meals: string[] = [];
            if (first.per_diem_b) meals.push("B");
            if (first.per_diem_l) meals.push("L");
            if (first.per_diem_d) meals.push("D");
            if (meals.length > 0) tags.push(`Per Diem: ${meals.join(", ")}`);
            // Check if any entry has a lunch remark
            const lunchMatch = first.remarks?.match(/lunch at (\d{4})/);
            if (lunchMatch) tags.push(`Lunch ${lunchMatch[1]}`);
            if (tags.length === 0) return null;
            return (
              <p className="text-[11px] text-muted-foreground px-1">
                {tags.join(" | ")}
              </p>
            );
          })()}
          {/* Expanded detail for selected crew member */}
          {expandedPersonnelIndex !== null && personnelEntries[expandedPersonnelIndex] && (
            <div className="space-y-2">
              <PersonnelEntryRow
                entry={personnelEntries[expandedPersonnelIndex]}
                index={expandedPersonnelIndex}
                collapsed={false}
                onToggle={() => setExpandedPersonnelIndex(null)}
                onChange={(idx, updated) => { setPersonnelEntries((prev) => prev.map((e, j) => (j === idx ? updated : e))); markDirty(); }}
                onRemove={(idx) => { if (personnelEntries.length > 1) { setPersonnelEntries((prev) => prev.filter((_, j) => j !== idx)); setExpandedPersonnelIndex(null); markDirty(); } }}
              />
              <button
                type="button"
                onClick={() => {
                  setPersonnelEntries((prev) => prev.filter((_, j) => j !== expandedPersonnelIndex));
                  setExpandedPersonnelIndex(null);
                  markDirty();
                }}
                className="w-full rounded-xl border border-destructive/40 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive touch-target active:bg-destructive/10"
              >
                Remove from this ticket
              </button>
            </div>
          )}
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
                <SignedImage src={contractorSigUrl} alt="Contractor signature" className="h-16 rounded border border-border bg-card" />
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
              <SignedImage src={supervisorSigUrl} alt="Supervisor signature" className="h-12 rounded border border-border bg-card" />
            ) : (
              <p className="text-xs text-muted-foreground italic">No signature yet</p>
            )}
          </button>
        </section>
      </div>

      {/* ── Lock banner ── */}
      {ticketLocked && (
        <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-0 right-0 px-3 z-40">
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
            <Lock className="h-4 w-4 text-warning shrink-0" />
            <p className="flex-1 text-[11px] font-medium text-warning leading-tight">
              {unlockedThisSession
                ? "Unlocked for editing — changes will be logged in the audit trail."
                : "This ticket is FINAL and locked. Supervisor signature is on file."}
            </p>
            {!unlockedThisSession && isAdmin && (
              <button
                type="button"
                onClick={() => setShowUnlockDialog(true)}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-warning text-warning-foreground px-2 py-1 text-[11px] font-semibold touch-target"
              >
                <Unlock className="h-3 w-3" /> Unlock
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Action Bar (above BottomNav) ── */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md p-3 flex gap-2 z-40">
        <button onClick={() => handleSave(false)} disabled={saving || editingLocked}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground touch-target disabled:opacity-40 active:scale-[0.98]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingLocked ? <Lock className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {editingLocked ? "Locked" : ticketLocked && unlockedThisSession ? "Save & Re-lock" : "Save Draft"}
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

      {/* Unlock dialog (admin override) */}
      <Dialog open={showUnlockDialog} onOpenChange={(o) => !o && !unlockSubmitting && setShowUnlockDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Unlock className="h-4 w-4" /> Unlock Final Ticket</DialogTitle>
            <DialogDescription>
              This ticket has been signed by the supervisor and is locked. Unlocking will allow edits, but every change will be permanently recorded in the audit trail along with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Reason for unlocking</label>
            <Textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Correcting a typo in equipment hours after supervisor sign-off"
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)} disabled={unlockSubmitting}>Cancel</Button>
            <Button onClick={handleUnlockConfirm} disabled={unlockSubmitting || unlockReason.trim().length < 4}>
              {unlockSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock for Editing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
