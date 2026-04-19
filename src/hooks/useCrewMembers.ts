import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCrewMembers,
  fetchCrewMember,
  createCrewMember,
  updateCrewMember,
  uploadCrewPhoto,
  deleteCrewPhoto,
} from "@/services/crew";
import type { CrewMemberInsert, CrewMemberUpdate } from "@/services/crew";
import { useOrganization } from "@/hooks/useOrganization";

export function useCrewMembers() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["crew_members", orgId],
    queryFn: () => fetchCrewMembers(orgId),
    enabled: !!orgId,
  });
}

export function useCrewMember(id: string) {
  return useQuery({
    queryKey: ["crew_members", id],
    queryFn: () => fetchCrewMember(id),
    enabled: !!id,
  });
}

export function useCreateCrewMember() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: CrewMemberInsert) =>
      createCrewMember({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
    },
  });
}

export function useUpdateCrewMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CrewMemberUpdate }) =>
      updateCrewMember(id, updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crew_members", vars.id] });
    },
  });
}

export function useUploadCrewPhoto(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, file }: { orgId: string; file: File }) =>
      uploadCrewPhoto(memberId, orgId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crew_members", memberId] });
    },
  });
}

export function useDeleteCrewPhoto(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCrewPhoto(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crew_members", memberId] });
    },
  });
}
