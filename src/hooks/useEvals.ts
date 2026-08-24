import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchEval,
  fetchEvals,
  createEval,
  updateEval,
  deleteEval,
  type PersonnelEvalInsert,
  type PersonnelEvalUpdate,
} from "@/services/evals";

export function useEvals() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["personnel_evals", orgId],
    queryFn: () => fetchEvals(orgId),
    enabled: !!orgId,
    staleTime: 1000 * 30,
    refetchOnMount: "always",
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function useEval(id: string | undefined) {
  return useQuery({
    queryKey: ["personnel_eval", id],
    queryFn: () => fetchEval(id!),
    enabled: !!id,
    staleTime: 1000 * 10,
    refetchOnMount: "always",
  });
}

export function useCreateEval() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<PersonnelEvalInsert, "organization_id">) =>
      createEval({
        ...input,
        organization_id: membership!.organizationId,
        created_by_user_id: user?.id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personnel_evals"] });
    },
  });
}

export function useUpdateEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PersonnelEvalUpdate }) => updateEval(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["personnel_evals"] });
      qc.invalidateQueries({ queryKey: ["personnel_eval", row.id] });
    },
  });
}

export function useDeleteEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEval(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personnel_evals"] });
    },
  });
}
