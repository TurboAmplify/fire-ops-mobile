import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncidents,
  fetchIncident,
  createIncident,
  updateIncident,
  deleteIncident,
} from "@/services/incidents";
import type { IncidentInsert, IncidentUpdate } from "@/services/incidents";
import { useOrganization } from "@/hooks/useOrganization";

export function useIncidents() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  return useQuery({
    queryKey: ["incidents", orgId],
    queryFn: () => fetchIncidents(orgId),
    enabled: !!orgId,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incidents", id],
    queryFn: () => fetchIncident(id),
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (data: IncidentInsert) =>
      createIncident({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: IncidentUpdate }) =>
      updateIncident(id, updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incidents", vars.id] });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
