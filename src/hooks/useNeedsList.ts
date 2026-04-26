import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNeedsListItems,
  createNeedsListItem,
  updateNeedsListItem,
  deleteNeedsListItem,
} from "@/services/needs-list";
import type { NeedsListInsert, NeedsListUpdate } from "@/services/needs-list";
import { useOrganization } from "@/hooks/useOrganization";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useNeedsList() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useQuery({
    queryKey: ["needs_list", orgId],
    queryFn: () => fetchNeedsListItems(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateNeedsListItem() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: Omit<NeedsListInsert, "organization_id">) => {
      assertOnlineForWrite();
      return createNeedsListItem({
        ...data,
        organization_id: membership?.organizationId ?? "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["needs_list"] });
    },
  });
}

export function useUpdateNeedsListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: NeedsListUpdate }) => {
      assertOnlineForWrite();
      return updateNeedsListItem(id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["needs_list"] });
    },
  });
}

export function useDeleteNeedsListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteNeedsListItem(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["needs_list"] });
    },
  });
}
