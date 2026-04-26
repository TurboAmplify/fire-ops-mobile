import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgreements, createAgreement, deleteAgreement } from "@/services/agreements";
import { useOrganization } from "@/hooks/useOrganization";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useAgreements(params: {
  incidentId?: string;
  incidentTruckId?: string;
  orgOnly?: boolean;
  organizationId?: string;
}) {
  return useQuery({
    queryKey: ["agreements", params],
    queryFn: () => fetchAgreements(params),
    enabled: !!(
      params.incidentId ||
      params.incidentTruckId ||
      (params.orgOnly && params.organizationId)
    ),
  });
}

export function useCreateAgreement(queryParams: {
  incidentId?: string;
  incidentTruckId?: string;
  orgOnly?: boolean;
  organizationId?: string;
}) {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: {
      incident_id?: string | null;
      incident_truck_id?: string | null;
      file_url: string;
      file_name: string;
      agreement_number?: string | null;
    }) => {
      assertOnlineForWrite();
      return createAgreement({
        ...data,
        organization_id: membership?.organizationId ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreements", queryParams] });
    },
  });
}

export function useDeleteAgreement(queryParams: {
  incidentId?: string;
  incidentTruckId?: string;
  orgOnly?: boolean;
  organizationId?: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteAgreement(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreements", queryParams] });
    },
  });
}
