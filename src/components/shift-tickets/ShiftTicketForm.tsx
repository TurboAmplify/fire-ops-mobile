import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Loader2, FileText, Save, Download, AlertTriangle, Copy, Lock, Unlock, RefreshCw, Info, Camera, DollarSign } from "lucide-react";
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
import { ShiftTicketImportSheet } from "./ShiftTicketImportSheet";
import { PayAdjustmentsSection } from "./PayAdjustmentsSection";
import { type ParsedShiftTicket, cropSignatureFromImage } from "@/services/shift-ticket-import";
import { fuzzyMatchName } from "@/lib/fuzzy-name";
import { evaluateCrewCount } from "@/lib/crew-minimums";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { SignedImage } from "@/components/ui/SignedImage";
import { uploadSignature, computeHours, buildRemarksString, insertSignatureAuditLog, enforceLunchDeduction } from "@/services/shift-tickets";
import { handleMutationError, isOnline } from "@/lib/offline-guard";
import { saveLocalSignature } from "@/lib/offline-signatures";
import {
  diffTicket,
  hasAnySignature,
  insertAuditEntries,
  isLocked as auditIsLocked,
} from "@/services/shift-ticket-audit";
import { useAuth } from "@/hooks/useAuth";
import type { ShiftTicket, EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";
import type { IncidentTruckCrewWithMember } from "@/services/incident-truck-crew";
import { useTicketAdjustments } from "@/hooks/usePayrollAdjustments";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { z } from "zod";
import {
  hoursSchema,
  optionalShortTextSchema,
  optionalLongTextSchema,
  pastOrTodayDateSchema,
  validateOrToast,
} from "@/lib/validation";

/**
 * Header-field validation only — entries are validated separately because
 * they have their own row UI. Only runs on EXPLICIT user save (not on the
 * 4s auto-save) so we don't toast-spam while the operator is typing.
 */
const shiftTicketHeaderSchema = z.object({
  incident_name: optionalShortTextSchema({ max: 120, label: "Incident name" }),
  incident_number: optionalShortTextSchema({ max: 60, label: "Incident #" }),
  agreement_number: optionalShortTextSchema({ max: 60, label: "Agreement #" }),
  resource_order_number: optionalShortTextSchema({ max: 60, label: "Resource order #" }),
  financial_code: optionalShortTextSchema({ max: 60, label: "Financial code" }),
  contractor_name: optionalShortTextSchema({ max: 120, label: "Contractor" }),
  contractor_rep_name: optionalShortTextSchema({ max: 100, label: "Contractor rep" }),
  supervisor_name: optionalShortTextSchema({ max: 100, label: "Supervisor" }),
  remarks: optionalLongTextSchema({ max: 4000, label: "Remarks" }),
});

/** Per-entry validation. Date and hours are the highest-risk fields. */
const equipmentEntrySchema = z.object({
  date: pastOrTodayDateSchema.optional().or(z.literal("").transform(() => undefined)),
  operating_hours: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === "" ? null : typeof v === "number" ? v : parseFloat(v)))
    .refine((v) => v == null || (Number.isFinite(v) && v >= 0 && v <= 24), {
      message: "Operating hours must be between 0 and 24",
    }),
  standby_hours: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === "" ? null : typeof v === "number" ? v : parseFloat(v)))
    .refine((v) => v == null || (Number.isFinite(v) && v >= 0 && v <= 24), {
      message: "Standby hours must be between 0 and 24",
    }),
});

const personnelEntrySchema = z.object({
  date: pastOrTodayDateSchema.optional().or(z.literal("").transform(() => undefined)),
  hours: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === "" ? null : typeof v === "number" ? v : parseFloat(v)))
    .refine((v) => v == null || (Number.isFinite(v) && v >= 0 && v <= 24), {
      message: "Hours must be between 0 and 24",
    }),
});

interface ShiftTicketFormProps {
  ticket: Partial<ShiftTicket> | null;
  incidentTruckId: string;
  organizationId: string;
  /** Incident this ticket belongs to. Required for the admin Pay Adjustments section. */
  incidentId?: string;
  saving: boolean;
  onSave: (data: Partial<ShiftTicket>) => void | Promise<void>;
  /** Called after a successful explicit (user-initiated) save, not on autosave. */
  onAfterExplicitSave?: (payload: Partial<ShiftTicket>) => void;
  /** Called when the user taps the "Send to Finance Officer" button. */
  onSendToFinanceOfficer?: () => void;
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
  incidentId,
  saving,
  onSave,
  onAfterExplicitSave,
  onSendToFinanceOfficer,
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
  const [thinCrewConfirmOpen, setThinCrewConfirmOpen] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [pendingSigs, setPendingSigs] = useState<Record<string, Blob>>({});

  // Collapsible personnel
  const [expandedPersonnelIndex, setExpandedPersonnelIndex] = useState<number | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<"header" | "equipment" | "remarks" | null>(null);
  const [showCrewPicker, setShowCrewPicker] = useState(false);

  // Supervisor sheet
  const [showSupervisorSheet, setShowSupervisorSheet] = useState(false);
  // Import-from-photo sheet
  const [showImportSheet, setShowImportSheet] = useState(false);
  const location = useLocation();
  const importAutoOpenedRef = useRef(false);
  useEffect(() => {
    const state = location.state as { openImport?: boolean } | null;
    if (state?.openImport && !importAutoOpenedRef.current) {
      importAutoOpenedRef.current = true;
      setShowImportSheet(true);
    }
  }, [location.state]);
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

  // ── Pay adjustment chip (admin-only) ──
  // Counts how many payroll_adjustments are scoped to this ticket: same
  // incident, same dates, same crew. Used to render the amber "+ N" chip
  // next to the ticket title and to know whether the post-script section
  // has anything in it.
  const { data: allCrewMembers } = useCrewMembers();
  const adjustmentCrewIds = (() => {
    if (!isAdmin || !allCrewMembers) return [] as string[];
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const entry of personnelEntries) {
      const key = (entry.operator_name || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      const m = allCrewMembers.find((c) => (c.name || "").trim().toLowerCase() === key);
      if (m) {
        seen.add(key);
        ids.push(m.id);
      }
    }
    return ids;
  })();
  const adjustmentDates = Array.from(
    new Set(personnelEntries.map((p) => p.date).filter(Boolean) as string[]),
  );
  const ticketAdjustments = useTicketAdjustments({
    incidentId,
    dates: adjustmentDates,
    crewMemberIds: adjustmentCrewIds,
    enabled: isAdmin,
  });
  const adjustmentsCount = isAdmin ? ticketAdjustments.length : 0;

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
    // Save-time guard: ensure any "30-min lunch" rows have the 0.5h actually
    // deducted from total. Catches legacy rows and direct edits.
    const normalizedPersonnel = enforceLunchDeduction(personnelEntries);
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
      personnel_entries: normalizedPersonnel as any,
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

    // Validate ONLY on explicit user save. Silent auto-saves bypass validation
    // so we don't toast-spam while the operator is mid-typing — DB CHECK
    // constraints (Step D) catch anything truly malformed.
    if (!silent) {
      const headerOk = validateOrToast(shiftTicketHeaderSchema, payload);
      if (!headerOk) return;

      const eqEntries = (payload.equipment_entries as unknown[]) ?? [];
      for (let i = 0; i < eqEntries.length; i++) {
        const result = equipmentEntrySchema.safeParse(eqEntries[i]);
        if (!result.success) {
          toast.error(`Equipment row ${i + 1}`, {
            description: result.error.issues[0]?.message ?? "Invalid entry",
          });
          return;
        }
      }
      const peEntries = (payload.personnel_entries as unknown[]) ?? [];
      for (let i = 0; i < peEntries.length; i++) {
        const result = personnelEntrySchema.safeParse(peEntries[i]);
        if (!result.success) {
          toast.error(`Personnel row ${i + 1}`, {
            description: result.error.issues[0]?.message ?? "Invalid entry",
          });
          return;
        }
      }
    }
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

      if (!silent) {
        showSuccess(payload.status === "final" ? "Saved & locked" : "Saved");
        onAfterExplicitSave?.(payload);
      }
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
      if (sigType === "supervisor") setShowSupervisorSheet(false);
      showSuccess("Signature captured");
      return;
    }

    setUploadingSig(true);
    try {
      // Offline: stash the blob locally and write a placeholder URL. The
      // offline-queue sync step uploads it and swaps the URL on reconnect.
      const url = isOnline()
        ? await uploadSignature(blob, ticket.id, sigType)
        : await saveLocalSignature(blob);
      const sigUpdate: Partial<ShiftTicket> = sigType === "contractor"
        ? {
            contractor_rep_signature_url: url,
            contractor_rep_signed_at: new Date().toISOString(),
          }
        : {
            supervisor_signature_url: url,
            supervisor_signed_at: new Date().toISOString(),
            status: "final",
          };

      if (sigType === "contractor") setContractorSigUrl(url);
      else setSupervisorSigUrl(url);

      if (isOnline()) {
        await insertSignatureAuditLog({
          shift_ticket_id: ticket.id,
          organization_id: organizationId || null,
          signer_type: sigType,
          signer_name: sigType === "contractor" ? contractorRepName : supervisorName,
          signature_url: url,
          method: metadata.method,
          font_used: metadata.font || null,
        });
      }

      await Promise.resolve(onSave({ ...buildSavePayload(), ...sigUpdate }));
      setIsDirty(false);
      if (sigType === "supervisor") setShowSupervisorSheet(false);
      showSuccess(isOnline() ? "Signature saved" : "Signature saved on device");
    } catch (err) {
      // M2-H3: Show failure as an error toast, not the green success overlay.
      // Offline writes get a friendly toast via handleMutationError; otherwise
      // fall back to the generic signature-failed message.
      handleMutationError(err, "Failed to save signature");
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
          const url = isOnline()
            ? await uploadSignature(blob, ticket.id!, sigType as "contractor" | "supervisor")
            : await saveLocalSignature(blob);
          if (sigType === "contractor") {
            setContractorSigUrl(url);
            sigUpdates.contractor_rep_signature_url = url;
            sigUpdates.contractor_rep_signed_at = new Date().toISOString();
          } else {
            setSupervisorSigUrl(url);
            sigUpdates.supervisor_signature_url = url;
            sigUpdates.supervisor_signed_at = new Date().toISOString();
            sigUpdates.status = "final";
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

  // Apply parsed shift ticket from imported photo/scan into form state.
  const handleImportApply = async (parsed: ParsedShiftTicket, mode: "fill-empty" | "replace", sourceFile: File | null) => {
    // Build a list of known crew names so OCR misreads ("Les Madstun") snap
    // to a real crew member ("Les Madsen") instead of creating a phantom.
    const knownNames = Array.from(
      new Set(
        [
          ...(crewRoster ?? []).map((m) => m.crew_members?.name || ""),
          ...availableCrewMembers.map((m) => m.name || ""),
        ].filter((n) => n.trim().length > 0)
      )
    );
    const snap = (raw: string | undefined): string => {
      const v = (raw ?? "").trim();
      if (!v || knownNames.length === 0) return v;
      const m = fuzzyMatchName(v, knownNames, 0.72);
      return m ? m.match : v;
    };

    const fill = (current: string, next: string | undefined) => {
      const v = (next ?? "").trim();
      if (!v) return current;
      if (mode === "replace") return v;
      return current ? current : v;
    };
    setAgreementNumber((c) => fill(c, parsed.agreement_number));
    setContractorName((c) => fill(c, parsed.contractor_name));
    setResourceOrderNumber((c) => fill(c, parsed.resource_order_number));
    setIncidentName((c) => fill(c, parsed.incident_name));
    setIncidentNumber((c) => fill(c, parsed.incident_number));
    setFinancialCode((c) => fill(c, parsed.financial_code));
    setEquipmentMakeModel((c) => fill(c, parsed.equipment_make_model));
    setEquipmentType((c) => fill(c, parsed.equipment_type));
    setSerialVin((c) => fill(c, parsed.serial_vin_number));
    setLicenseId((c) => fill(c, parsed.license_id_number));
    setContractorRepName((c) => fill(c, snap(parsed.contractor_rep_name)));
    setSupervisorName((c) => fill(c, snap(parsed.supervisor_name)));
    setRemarks((c) => fill(c, parsed.remarks));
    if (typeof parsed.transport_retained === "boolean" && (mode === "replace" || !transportRetained)) {
      setTransportRetained(parsed.transport_retained);
    }
    if (typeof parsed.is_first_last === "boolean" && (mode === "replace" || !isFirstLast)) {
      setIsFirstLast(parsed.is_first_last);
    }
    if (typeof parsed.miles === "number" && (mode === "replace" || !miles)) {
      setMiles(String(parsed.miles));
    }

    const importedEq = (parsed.equipment_entries ?? [])
      .filter((r) => r && (r.date || r.start || r.stop || r.quantity || r.type))
      .map<EquipmentEntry>((r) => ({
        date: r.date || getLocalDateString(),
        start: r.start || "",
        stop: r.stop || "",
        total: computeHours(r.start || "", r.stop || ""),
        quantity: r.quantity || "1",
        type: r.type || "Day",
        remarks: r.remarks || "",
      }));
    if (importedEq.length > 0) {
      const isFormEmpty = equipmentEntries.length === 0 ||
        (equipmentEntries.length === 1 && !equipmentEntries[0].start && !equipmentEntries[0].stop);
      if (mode === "replace" || isFormEmpty) setEquipmentEntries(importedEq);
    }

    const importedPe = (parsed.personnel_entries ?? [])
      .filter((r) => r && (r.operator_name || r.op_start || r.op_stop))
      .map<PersonnelEntry>((r) => {
        const op = computeHours(r.op_start || "", r.op_stop || "");
        const sb = computeHours(r.sb_start || "", r.sb_stop || "");
        const activity = r.activity_type === "travel" ? ("travel" as const) : ("work" as const);
        return {
          date: r.date || getLocalDateString(),
          operator_name: snap(r.operator_name),
          op_start: r.op_start || "",
          op_stop: r.op_stop || "",
          sb_start: r.sb_start || "",
          sb_stop: r.sb_stop || "",
          total: Math.round((op + sb) * 10) / 10,
          remarks: r.remarks || (activity === "travel" ? "Travel/Check-In" : "Work"),
          activity_type: activity,
          lodging: false,
          per_diem_b: false,
          per_diem_l: false,
          per_diem_d: false,
        };
      });
    if (importedPe.length > 0) {
      const isFormEmpty = personnelEntries.length === 0 ||
        (personnelEntries.length === 1 && !personnelEntries[0].operator_name && !personnelEntries[0].op_start);
      if (mode === "replace" || isFormEmpty) setPersonnelEntries(importedPe);
    }

    // Crop signatures from the source photo so the digital record shows the
    // actual ink the engine boss / supervisor signed on the paper ticket.
    // Stage as blobs in pendingSigs — the existing effect will upload them
    // once the ticket has an id (or immediately if it already does).
    if (sourceFile) {
      try {
        const stagedSigs: Record<string, Blob> = {};
        if (parsed.contractor_signature_box) {
          const blob = await cropSignatureFromImage(sourceFile, parsed.contractor_signature_box);
          if (blob) {
            stagedSigs.contractor = blob;
            setContractorSigUrl(URL.createObjectURL(blob));
          }
        }
        if (parsed.supervisor_signature_box) {
          const blob = await cropSignatureFromImage(sourceFile, parsed.supervisor_signature_box);
          if (blob) {
            stagedSigs.supervisor = blob;
            setSupervisorSigUrl(URL.createObjectURL(blob));
          }
        }
        if (Object.keys(stagedSigs).length > 0) {
          setPendingSigs((prev) => ({ ...prev, ...stagedSigs }));
          toast.success("Signatures captured from photo — review before saving.");
        } else if (parsed.contractor_signature_box || parsed.supervisor_signature_box) {
          toast.warning("Could not crop signatures from the source. Re-sign in the form if needed.");
        }
      } catch (err) {
        console.error("Signature crop failed:", err);
      }
    }

    markDirty();
  };

  return (
    <AppShell title="Shift Ticket" onBack={() => isDirty ? setShowLeaveDialog(true) : onBack?.()}>
      <div className="px-4 pt-3 pb-40 space-y-5" style={{ overflowX: 'clip' }}>
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-base font-extrabold truncate">OF-297 Shift Ticket</h2>
          {ticket?.status === "draft" && (
            <span className="shrink-0 rounded-full bg-warning/20 text-warning px-2 py-0.5 text-[10px] font-bold">DRAFT</span>
          )}
          {isAdmin && adjustmentsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                document.getElementById("pay-adjustments-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-warning/15 border border-warning/40 px-2 py-0.5 text-[10px] font-bold text-warning touch-target active:bg-warning/25"
              title="Jump to Pay Adjustments"
            >
              <DollarSign className="h-3 w-3" /> Pay adjustments ({adjustmentsCount})
            </button>
          )}
          {!editingLocked && (
            <button
              type="button"
              onClick={() => setShowImportSheet(true)}
              title="Import from photo or PDF of paper ticket"
              className={`${onRefreshFromSources && ticket?.id ? "" : "ml-auto"} flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary touch-target active:bg-primary/20`}
            >
              <Camera className="h-3 w-3" />
              Import paper ticket
            </button>
          )}
          {onRefreshFromSources && ticket?.id && !editingLocked && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh from Truck & Resource Order"
              className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground touch-target active:bg-accent/40 disabled:opacity-50"
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

        {/* Paper ticket photo (when attached via Quick Attach) */}
        {(ticket as any)?.paper_ticket_photo_url && (
          <a
            href={(ticket as any).paper_ticket_photo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 active:bg-primary/10 transition-colors"
          >
            <SignedImage
              src={(ticket as any).paper_ticket_photo_url}
              alt="Paper shift ticket"
              className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary">Paper ticket attached</p>
              <p className="text-[11px] text-muted-foreground">Tap to view full photo</p>
            </div>
          </a>
        )}

        {/* ── Chip row for secondary info ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {([
            { key: "header" as const, label: "Header", hasData: !!(incidentName || agreementNumber || contractorName) },
            { key: "equipment" as const, label: "Equipment", hasData: !!(equipmentMakeModel || equipmentType || licenseId || transportRetained || isFirstLast || miles) },
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

              {/* 12. Transport Retained */}
              <label className="flex items-center gap-3 touch-target pt-2 border-t border-border">
                <input type="checkbox" checked={transportRetained} onChange={(e) => { setTransportRetained(e.target.checked); markDirty(); }} className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm">12. Transport Retained</span>
              </label>

              {/* 13. First/Last Ticket — matches OF-297 block 13 */}
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

              {/* 14. Miles — matches OF-297 block 14 */}
              <div>
                <label className={labelClass}>14. Miles / Hours (real odometer reading)</label>
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

        {/* Thin-crew warning banner — non-blocking */}
        {(() => {
          const evalRes = evaluateCrewCount(personnelEntries, equipmentType);
          if (!evalRes.isUnderMin) return null;
          return (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs leading-snug">
                <span className="font-semibold">{evalRes.rule.label} should have at least {evalRes.rule.min} crew.</span>{" "}
                This ticket has {evalRes.count}. You'll be asked to confirm when signing.
              </p>
            </div>
          );
        })()}

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
              <button onClick={() => {
                  const evalRes = evaluateCrewCount(personnelEntries, equipmentType);
                  if (evalRes.isUnderMin) setThinCrewConfirmOpen(true);
                  else setSigModal("contractor");
                }} disabled={uploadingSig}
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

        {/* ── Pay Adjustments (admin-only post-script, after signatures) ── */}
        {isAdmin && incidentId && (
          <PayAdjustmentsSection
            incidentId={incidentId}
            personnelEntries={personnelEntries}
            organizationId={organizationId}
          />
        )}
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
      <div className="fixed bottom-[calc(3.5rem+var(--app-safe-bottom))] left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md p-3 flex gap-2 z-40">
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

      {/* Thin-crew confirm dialog (gates contractor signature) */}
      <Dialog open={thinCrewConfirmOpen} onOpenChange={setThinCrewConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Short crew on this ticket
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const ev = evaluateCrewCount(personnelEntries, equipmentType);
                return `${ev.rule.label} should have at least ${ev.rule.min} crew. This ticket has ${ev.count}. Confirm and sign anyway?`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setThinCrewConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setThinCrewConfirmOpen(false); setSigModal("contractor"); }}>
              I confirm short crew
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Import paper ticket from photo/PDF */}
      <ShiftTicketImportSheet
        open={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        organizationId={organizationId || ""}
        onApply={(parsed, mode, sourceFile) => {
          handleImportApply(parsed, mode, sourceFile);
          setShowImportSheet(false);
        }}
      />
    </AppShell>
  );
}
