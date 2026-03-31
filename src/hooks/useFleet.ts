import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrucks,
  fetchTruck,
  createTruck,
  updateTruck,
  deleteTruck,
  fetchTruckPhotos,
  uploadTruckPhoto,
  deleteTruckPhoto,
  updateTruckPhotoLabel,
  fetchTruckDocuments,
  uploadTruckDocument,
  deleteTruckDocument,
  fetchTruckChecklist,
  addChecklistItem,
  toggleChecklistItem,
  updateChecklistItemNotes,
  deleteChecklistItem,
  resetChecklist,
  initializeDefaultChecklist,
  fetchServiceLogs,
  createServiceLog,
  deleteServiceLog,
  updateTruckHeroPhoto,
  deleteTruckHeroPhoto,
} from "@/services/fleet";
import type { TruckInsert, TruckUpdate } from "@/services/fleet";

export function useTrucks() {
  return useQuery({
    queryKey: ["trucks"],
    queryFn: fetchTrucks,
  });
}

export function useTruck(id: string) {
  return useQuery({
    queryKey: ["trucks", id],
    queryFn: () => fetchTruck(id),
    enabled: !!id,
  });
}

export function useCreateTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (truck: TruckInsert) => createTruck(truck),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trucks"] }),
  });
}

export function useUpdateTruck(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: TruckUpdate) => updateTruck(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trucks"] });
      qc.invalidateQueries({ queryKey: ["trucks", id] });
    },
  });
}

export function useDeleteTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTruck(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trucks"] }),
  });
}

// Photos
export function useTruckPhotos(truckId: string) {
  return useQuery({
    queryKey: ["truck-photos", truckId],
    queryFn: () => fetchTruckPhotos(truckId),
    enabled: !!truckId,
  });
}

export function useUploadTruckPhoto(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, file }: { orgId: string; file: File }) =>
      uploadTruckPhoto(truckId, orgId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-photos", truckId] }),
  });
}

export function useDeleteTruckPhoto(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTruckPhoto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-photos", truckId] }),
  });
}

// Documents
export function useTruckDocuments(truckId: string) {
  return useQuery({
    queryKey: ["truck-documents", truckId],
    queryFn: () => fetchTruckDocuments(truckId),
    enabled: !!truckId,
  });
}

export function useUploadTruckDocument(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      file,
      docType,
      title,
    }: {
      orgId: string;
      file: File;
      docType: string;
      title?: string;
    }) => uploadTruckDocument(truckId, orgId, file, docType, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-documents", truckId] }),
  });
}

export function useDeleteTruckDocument(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTruckDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-documents", truckId] }),
  });
}

// Checklist
export function useTruckChecklist(truckId: string) {
  return useQuery({
    queryKey: ["truck-checklist", truckId],
    queryFn: () => fetchTruckChecklist(truckId),
    enabled: !!truckId,
  });
}

export function useAddChecklistItem(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, label, sortOrder }: { orgId: string; label: string; sortOrder?: number }) =>
      addChecklistItem(truckId, orgId, label, sortOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-checklist", truckId] }),
  });
}

export function useToggleChecklistItem(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isComplete }: { id: string; isComplete: boolean }) =>
      toggleChecklistItem(id, isComplete),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-checklist", truckId] }),
  });
}

export function useUpdateChecklistItemNotes(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateChecklistItemNotes(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-checklist", truckId] }),
  });
}

export function useDeleteChecklistItem(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-checklist", truckId] }),
  });
}

export function useInitializeDefaultChecklist(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => initializeDefaultChecklist(truckId, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-checklist", truckId] }),
  });
}

export function useResetChecklist(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resetChecklist(truckId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-checklist", truckId] }),
  });
}

export function useUpdateTruckPhotoLabel(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, photoLabel }: { id: string; photoLabel: string }) =>
      updateTruckPhotoLabel(id, photoLabel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-photos", truckId] }),
  });
}

// Service Logs
export function useServiceLogs(truckId: string) {
  return useQuery({
    queryKey: ["truck-service-logs", truckId],
    queryFn: () => fetchServiceLogs(truckId),
    enabled: !!truckId,
  });
}

export function useCreateServiceLog(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: Parameters<typeof createServiceLog>[0]) => createServiceLog(log),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-service-logs", truckId] }),
  });
}

export function useDeleteServiceLog(truckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteServiceLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["truck-service-logs", truckId] }),
  });
}
