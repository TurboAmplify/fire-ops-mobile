import { useMemo } from "react";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useCrews } from "@/hooks/useCrews";
import {
  isTruckComplete,
  isCrewMemberComplete,
  countCrewMembers,
} from "@/lib/profile-completion";

export interface SetupCompletion {
  totalIssues: number;
  incompleteTrucks: number;
  incompleteMembers: number;
  emptyCrews: number;
  hasAnyData: boolean;
  loading: boolean;
}

/**
 * Computes how many resources still need profile details filled in.
 * Drives the Dashboard "Finish setup" card and any badge counters.
 */
export function useSetupCompletion(): SetupCompletion {
  const { data: trucks, isLoading: l1 } = useTrucks();
  const { data: members, isLoading: l2 } = useCrewMembers();
  const { data: crews, isLoading: l3 } = useCrews();

  return useMemo(() => {
    const incompleteTrucks = (trucks ?? []).filter((t) => !isTruckComplete(t)).length;
    const incompleteMembers = (members ?? []).filter((m) => !isCrewMemberComplete(m)).length;
    const emptyCrews = (crews ?? []).filter((c) => countCrewMembers(c.id, members ?? []) === 0).length;

    return {
      totalIssues: incompleteTrucks + incompleteMembers + emptyCrews,
      incompleteTrucks,
      incompleteMembers,
      emptyCrews,
      hasAnyData: (trucks?.length ?? 0) + (members?.length ?? 0) + (crews?.length ?? 0) > 0,
      loading: l1 || l2 || l3,
    };
  }, [trucks, members, crews, l1, l2, l3]);
}
