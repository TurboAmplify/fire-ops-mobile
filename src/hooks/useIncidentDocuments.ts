import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncidentDocuments,
  createIncidentDocument,
  deleteIncidentDocument,
  fetchIncidentsWithOF286,
  type IncidentDocumentType,
} from "@/services/incident-documents";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { assertOnlineForWrite } from "@/lib/offline-guard";

export function useIncidentDocuments(
  incidentId: string | undefined,
  documentType?: IncidentDocumentType,
) {
  return useQuery({
    queryKey: ["incident-documents", incidentId, documentType ?? "all"],
    queryFn: () => fetchIncidentDocuments(incidentId!, documentType),
    enabled: !!incidentId,
  });
}

export function useCreateIncidentDocument(incidentId: string | undefined) {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data: {
      document_type: IncidentDocumentType;
      file_url: string;
      file_name: string;
    }) => {
      assertOnlineForWrite();
      if (!membership?.organizationId) throw new Error("No organization");
      if (!incidentId) throw new Error("No incident");
      return createIncidentDocument({
        incident_id: incidentId,
        organization_id: membership.organizationId,
        document_type: data.document_type,
        file_url: data.file_url,
        file_name: data.file_name,
        uploaded_by_user_id: user?.id ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    },
  });
}

export function useDeleteIncidentDocument(incidentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      assertOnlineForWrite();
      return deleteIncidentDocument(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    },
  });
}

/** Returns a Set of incident IDs that already have an OF-286 uploaded. */
export function useIncidentsWithOF286(incidentIds: string[] | undefined) {
  const ids = incidentIds ?? [];
  return useQuery({
    queryKey: ["incident-of286-flags", ids.slice().sort().join(",")],
    queryFn: () => fetchIncidentsWithOF286(ids),
    enabled: ids.length > 0,
  });
}
