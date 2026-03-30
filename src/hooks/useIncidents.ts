import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncidents,
  fetchIncident,
  createIncident,
  updateIncident,
  deleteIncident,
} from "@/services/incidents";
import type { IncidentInsert, IncidentUpdate } from "@/services/incidents";

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
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
  return useMutation({
    mutationFn: (data: IncidentInsert) => createIncident(data),
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
