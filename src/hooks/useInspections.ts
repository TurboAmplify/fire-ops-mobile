import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertOnlineForWrite } from "@/lib/offline-guard";
import {
  addTemplateItem,
  createTemplate,
  deleteTemplate,
  deleteTemplateItem,
  getDefaultTemplate,
  getLastInspection,
  isInspectionDueForTruck,
  listInspectionsForTruck,
  listTemplateItems,
  listTemplates,
  submitInspection,
  updateTemplate,
  updateTemplateItem,
  type SubmitInspectionInput,
  type TemplateType,
} from "@/services/inspections";

export const inspectionKeys = {
  templates: (orgId: string, type?: TemplateType) => ["inspection-templates", orgId, type ?? "all"] as const,
  defaultTemplate: (orgId: string, type: TemplateType) => ["inspection-templates", "default", orgId, type] as const,
  templateItems: (templateId: string) => ["inspection-template-items", templateId] as const,
  truckInspections: (truckId: string) => ["truck-inspections", truckId] as const,
  lastInspection: (truckId: string) => ["truck-inspections", "last", truckId] as const,
  inspectionDue: (truckId: string) => ["truck-inspections", "due", truckId] as const,
};

export function useInspectionTemplates(orgId: string | undefined, type?: TemplateType) {
  return useQuery({
    queryKey: inspectionKeys.templates(orgId ?? "", type),
    queryFn: () => listTemplates(orgId!, type),
    enabled: !!orgId,
  });
}

export function useDefaultInspectionTemplate(orgId: string | undefined, type: TemplateType = "walkaround") {
  return useQuery({
    queryKey: inspectionKeys.defaultTemplate(orgId ?? "", type),
    queryFn: () => getDefaultTemplate(orgId!, type),
    enabled: !!orgId,
  });
}

export function useInspectionTemplateItems(templateId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.templateItems(templateId ?? ""),
    queryFn: () => listTemplateItems(templateId!),
    enabled: !!templateId,
  });
}

export function useTruckInspections(truckId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.truckInspections(truckId ?? ""),
    queryFn: () => listInspectionsForTruck(truckId!),
    enabled: !!truckId,
  });
}

export function useLastInspection(truckId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.lastInspection(truckId ?? ""),
    queryFn: () => getLastInspection(truckId!),
    enabled: !!truckId,
  });
}

export function useInspectionDue(truckId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.inspectionDue(truckId ?? ""),
    queryFn: () => isInspectionDueForTruck(truckId!),
    enabled: !!truckId,
    staleTime: 60_000,
  });
}

export function useSubmitInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitInspectionInput) => {
      assertOnlineForWrite();
      return submitInspection(input);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: inspectionKeys.truckInspections(input.truckId) });
      qc.invalidateQueries({ queryKey: inspectionKeys.lastInspection(input.truckId) });
      qc.invalidateQueries({ queryKey: inspectionKeys.inspectionDue(input.truckId) });
    },
  });
}

function invalidateTemplates(qc: ReturnType<typeof useQueryClient>, orgId?: string) {
  if (!orgId) return;
  qc.invalidateQueries({ queryKey: ["inspection-templates", orgId] });
  qc.invalidateQueries({ queryKey: ["inspection-templates"] });
}

export function useCreateTemplate(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, isDefault, templateType }: { name: string; isDefault?: boolean; templateType?: TemplateType }) => {
      assertOnlineForWrite();
      return createTemplate(orgId!, name, isDefault, templateType);
    },
    onSuccess: () => invalidateTemplates(qc, orgId),
  });
}

export function useUpdateTemplate(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTemplate>[1] }) => {
      assertOnlineForWrite();
      return updateTemplate(id, patch, orgId);
    },
    onSuccess: () => invalidateTemplates(qc, orgId),
  });
}

export function useDeleteTemplate(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteTemplate(id);
    },
    onSuccess: () => invalidateTemplates(qc, orgId),
  });
}

export function useAddTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ label, sortOrder }: { label: string; sortOrder: number }) => {
      assertOnlineForWrite();
      return addTemplateItem(templateId!, label, sortOrder);
    },
    onSuccess: () => {
      if (templateId) qc.invalidateQueries({ queryKey: inspectionKeys.templateItems(templateId) });
    },
  });
}

export function useUpdateTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTemplateItem>[1] }) => {
      assertOnlineForWrite();
      return updateTemplateItem(id, patch);
    },
    onSuccess: () => {
      if (templateId) qc.invalidateQueries({ queryKey: inspectionKeys.templateItems(templateId) });
    },
  });
}

export function useDeleteTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteTemplateItem(id);
    },
    onSuccess: () => {
      if (templateId) qc.invalidateQueries({ queryKey: inspectionKeys.templateItems(templateId) });
    },
  });
}
