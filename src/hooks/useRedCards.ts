import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRedCardByMember,
  fetchRedCardForUser,
  upsertRedCard,
  updateRedCard,
  deleteRedCard,
} from "@/services/red-cards";
import type { RedCardInsert, RedCardUpdate } from "@/services/red-cards";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { assertOnlineForWrite } from "@/lib/offline-guard";
import { useAppMode } from "@/lib/app-mode";

/** Per-org feature flag controlled by Super Admin (organizations.modules_enabled.redCards). */
export function useRedCardsEnabled() {
  const mode = useAppMode();
  return !!(mode.modules as any).redCards;
}

export function useRedCardByMember(crewMemberId: string | null | undefined) {
  return useQuery({
    queryKey: ["red_cards", "by_member", crewMemberId],
    queryFn: () => fetchRedCardByMember(crewMemberId!),
    enabled: !!crewMemberId,
  });
}

export function useMyRedCard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["red_cards", "mine", user?.id],
    queryFn: () => fetchRedCardForUser(user!.id),
    enabled: !!user?.id,
  });
}

export function useUpsertRedCard() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: RedCardInsert) => {
      assertOnlineForWrite();
      return upsertRedCard({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? "",
      });
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["red_cards"] });
      qc.invalidateQueries({ queryKey: ["red_cards", "by_member", row.crew_member_id] });
    },
  });
}

export function useUpdateRedCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: RedCardUpdate }) => {
      assertOnlineForWrite();
      return updateRedCard(id, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["red_cards"] }),
  });
}

export function useDeleteRedCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteRedCard(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["red_cards"] }),
  });
}
