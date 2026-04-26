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
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useCrewMembers() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["crew_members", orgId],
    queryFn: () => fetchCrewMembers(orgId),
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10, // 10 min — Phase 1 cache extension
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — survive multi-day offline
  });
}

export function useCrewMember(id: string) {
  return useQuery({
    queryKey: ["crew_members", id],
    queryFn: () => fetchCrewMember(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function useCreateCrewMember() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: CrewMemberInsert) => {
      assertOnlineForWrite();
      return createCrewMember({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
    },
  });
}

export function useUpdateCrewMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CrewMemberUpdate }) => {
      assertOnlineForWrite();
      return updateCrewMember(id, updates);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crew_members", vars.id] });
    },
  });
}

export function useUploadCrewPhoto(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, file }: { orgId: string; file: File }) => {
      assertOnlineForWrite();
      return uploadCrewPhoto(memberId, orgId, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crew_members", memberId] });
    },
  });
}

export function useDeleteCrewPhoto(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      assertOnlineForWrite();
      return deleteCrewPhoto(memberId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew_members"] });
      qc.invalidateQueries({ queryKey: ["crew_members", memberId] });
    },
  });
}
