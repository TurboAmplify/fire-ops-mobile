import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import {
  createTrainingRecord,
  deleteTrainingRecord,
  listTrainingRecords,
  updateTrainingRecord,
  type TrainingRecord,
} from "@/services/training";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useTrainingRecords() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useQuery({
    queryKey: ["training-records", orgId],
    enabled: !!orgId,
    queryFn: () => listTrainingRecords(orgId!),
  });
}

export function useCreateTrainingRecord() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (input: Omit<TrainingRecord, "id" | "created_at" | "organization_id">) => {
      assertOnlineForWrite();
      return createTrainingRecord({ ...input, organization_id: membership!.organizationId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-records"] }),
  });
}

export function useUpdateTrainingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TrainingRecord> }) => {
      assertOnlineForWrite();
      return updateTrainingRecord(id, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-records"] }),
  });
}

export function useDeleteTrainingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteTrainingRecord(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-records"] }),
  });
}
