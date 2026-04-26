import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCrews,
  fetchCrew,
  createCrew,
  updateCrew,
  deleteCrew,
  assignMemberToCrew,
  type CrewInsert,
  type CrewUpdate,
} from "@/services/crews";
import { useOrganization } from "@/hooks/useOrganization";

export function useCrews() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["crews", orgId],
    queryFn: () => fetchCrews(orgId),
    enabled: !!orgId,
  });
}

export function useCrew(id: string) {
  return useQuery({
    queryKey: ["crews", id],
    queryFn: () => fetchCrew(id),
    enabled: !!id,
  });
}

export function useCreateCrew() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: Omit<CrewInsert, "organization_id"> & { organization_id?: string }) =>
      createCrew({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? "",
      } as CrewInsert),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crews"] }),
  });
}

export function useUpdateCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CrewUpdate }) =>
      updateCrew(id, updates),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crews"] });
      qc.invalidateQueries({ queryKey: ["crews", vars.id] });
    },
  });
}

export function useDeleteCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCrew(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crews"] });
      qc.invalidateQueries({ queryKey: ["crew_members"] });
    },
  });
}

export function useAssignMemberToCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, crewId }: { memberId: string; crewId: string | null }) =>
      assignMemberToCrew(memberId, crewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crews"] });
    },
  });
}
