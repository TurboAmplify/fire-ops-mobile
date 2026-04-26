import { useMemo } from "react";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useCrews } from "@/hooks/useCrews";
import {
  isTruckComplete,
  isCrewMemberComplete,
  countCrewMembers,
  truckMissingFields,
  crewMemberMissingFields,
} from "@/lib/profile-completion";

export interface IncompleteTruck {
  id: string;
  name: string;
  missing: string[];
}

export interface IncompleteMember {
  id: string;
  name: string;
  missing: string[];
}

export interface EmptyCrew {
  id: string;
  name: string;
}

export interface SetupCompletion {
  totalIssues: number;
  incompleteTrucks: number;
  incompleteMembers: number;
  emptyCrews: number;
  incompleteTruckList: IncompleteTruck[];
  incompleteMemberList: IncompleteMember[];
  emptyCrewList: EmptyCrew[];
  hasAnyData: boolean;
  loading: boolean;
}

/**
 * Computes how many resources still need profile details filled in,
 * along with the actual items + which fields are missing on each.
 * Drives the Dashboard "Finish setup" card.
 */
export function useSetupCompletion(): SetupCompletion {
  const { data: trucks, isLoading: l1 } = useTrucks();
  const { data: members, isLoading: l2 } = useCrewMembers();
  const { data: crews, isLoading: l3 } = useCrews();

  return useMemo(() => {
    const incompleteTruckList: IncompleteTruck[] = (trucks ?? [])
      .filter((t) => !isTruckComplete(t))
      .map((t) => ({
        id: t.id,
        name: t.name ?? "Unnamed truck",
        missing: truckMissingFields(t),
      }));

    const incompleteMemberList: IncompleteMember[] = (members ?? [])
      .filter((m) => !isCrewMemberComplete(m))
      .map((m) => ({
        id: m.id,
        name: m.name ?? "Unnamed member",
        missing: crewMemberMissingFields(m),
      }));

    const emptyCrewList: EmptyCrew[] = (crews ?? [])
      .filter((c) => countCrewMembers(c.id, members ?? []) === 0)
      .map((c) => ({ id: c.id, name: c.name ?? "Unnamed crew" }));

    const incompleteTrucks = incompleteTruckList.length;
    const incompleteMembers = incompleteMemberList.length;
    const emptyCrews = emptyCrewList.length;

    return {
      totalIssues: incompleteTrucks + incompleteMembers + emptyCrews,
      incompleteTrucks,
      incompleteMembers,
      emptyCrews,
      incompleteTruckList,
      incompleteMemberList,
      emptyCrewList,
      hasAnyData: (trucks?.length ?? 0) + (members?.length ?? 0) + (crews?.length ?? 0) > 0,
      loading: l1 || l2 || l3,
    };
  }, [trucks, members, crews, l1, l2, l3]);
}
