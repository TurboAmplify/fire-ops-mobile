import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/services/inspections";

export const inspectionKeys = {
  templates: (orgId: string) => ["inspection-templates", orgId] as const,
  defaultTemplate: (orgId: string) => ["inspection-templates", "default", orgId] as const,
  templateItems: (templateId: string) => ["inspection-template-items", templateId] as const,
  truckInspections: (truckId: string) => ["truck-inspections", truckId] as const,
  lastInspection: (truckId: string) => ["truck-inspections", "last", truckId] as const,
  inspectionDue: (truckId: string) => ["truck-inspections", "due", truckId] as const,
};

export function useInspectionTemplates(orgId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.templates(orgId ?? ""),
    queryFn: () => listTemplates(orgId!),
    enabled: !!orgId,
  });
}

export function useDefaultInspectionTemplate(orgId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.defaultTemplate(orgId ?? ""),
    queryFn: () => getDefaultTemplate(orgId!),
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
    mutationFn: (input: SubmitInspectionInput) => submitInspection(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: inspectionKeys.truckInspections(input.truckId) });
      qc.invalidateQueries({ queryKey: inspectionKeys.lastInspection(input.truckId) });
      qc.invalidateQueries({ queryKey: inspectionKeys.inspectionDue(input.truckId) });
    },
  });
}

export function useCreateTemplate(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, isDefault }: { name: string; isDefault?: boolean }) =>
      createTemplate(orgId!, name, isDefault),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: inspectionKeys.templates(orgId) });
        qc.invalidateQueries({ queryKey: inspectionKeys.defaultTemplate(orgId) });
      }
    },
  });
}

export function useUpdateTemplate(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTemplate>[1] }) =>
      updateTemplate(id, patch, orgId),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: inspectionKeys.templates(orgId) });
        qc.invalidateQueries({ queryKey: inspectionKeys.defaultTemplate(orgId) });
      }
    },
  });
}

export function useDeleteTemplate(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: inspectionKeys.templates(orgId) });
        qc.invalidateQueries({ queryKey: inspectionKeys.defaultTemplate(orgId) });
      }
    },
  });
}

export function useAddTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ label, sortOrder }: { label: string; sortOrder: number }) =>
      addTemplateItem(templateId!, label, sortOrder),
    onSuccess: () => {
      if (templateId) qc.invalidateQueries({ queryKey: inspectionKeys.templateItems(templateId) });
    },
  });
}

export function useUpdateTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTemplateItem>[1] }) =>
      updateTemplateItem(id, patch),
    onSuccess: () => {
      if (templateId) qc.invalidateQueries({ queryKey: inspectionKeys.templateItems(templateId) });
    },
  });
}

export function useDeleteTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplateItem(id),
    onSuccess: () => {
      if (templateId) qc.invalidateQueries({ queryKey: inspectionKeys.templateItems(templateId) });
    },
  });
}
