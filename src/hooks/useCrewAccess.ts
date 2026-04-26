import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAccessForUser,
  fetchAccessForTruck,
  grantTruckAccess,
  revokeTruckAccess,
} from "@/services/crew-access";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useAccessForUser(orgId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["crew-access", "user", orgId, userId],
    queryFn: () => fetchAccessForUser(orgId!, userId!),
    enabled: !!orgId && !!userId,
  });
}

export function useAccessForTruck(truckId: string | undefined) {
  return useQuery({
    queryKey: ["crew-access", "truck", truckId],
    queryFn: () => fetchAccessForTruck(truckId!),
    enabled: !!truckId,
  });
}

export function useGrantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof grantTruckAccess>[0]) => {
      assertOnlineForWrite();
      return grantTruckAccess(input);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crew-access", "user", vars.organizationId, vars.userId] });
      qc.invalidateQueries({ queryKey: ["crew-access", "truck", vars.truckId] });
      qc.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}

export function useRevokeAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof revokeTruckAccess>[0]) => {
      assertOnlineForWrite();
      return revokeTruckAccess(input);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crew-access"] });
      qc.invalidateQueries({ queryKey: ["crew-access", "truck", vars.truckId] });
      qc.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}
