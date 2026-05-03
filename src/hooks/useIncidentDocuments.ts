import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncidentDocuments,
  createIncidentDocument,
  deleteIncidentDocument,
  fetchIncidentsWithOF286,
  updateIncidentDocumentInvoiceTotal,
  logIncidentDocumentEvent,
  fetchIncidentDocumentAudit,
  type IncidentDocumentType,
  type IncidentDocumentStage,
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

export function useIncidentDocumentAudit(
  incidentId: string | undefined,
  documentType: string = "of286",
) {
  return useQuery({
    queryKey: ["incident-document-audit", incidentId, documentType],
    queryFn: () => fetchIncidentDocumentAudit(incidentId!, documentType),
    enabled: !!incidentId,
  });
}

export function useCreateIncidentDocument(incidentId: string | undefined) {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: {
      document_type: IncidentDocumentType;
      stage?: IncidentDocumentStage;
      parent_document_id?: string | null;
      file_url: string;
      file_name: string;
      signature_url?: string | null;
      signed_by_name?: string | null;
      signed_at?: string | null;
    }) => {
      assertOnlineForWrite();
      if (!membership?.organizationId) throw new Error("No organization");
      if (!incidentId) throw new Error("No incident");
      const stage = data.stage ?? "original";
      const doc = await createIncidentDocument({
        incident_id: incidentId,
        organization_id: membership.organizationId,
        document_type: data.document_type,
        stage,
        parent_document_id: data.parent_document_id ?? null,
        file_url: data.file_url,
        file_name: data.file_name,
        uploaded_by_user_id: user?.id ?? null,
        signature_url: data.signature_url ?? null,
        signed_by_user_id: data.signed_by_name ? user?.id ?? null : null,
        signed_by_name: data.signed_by_name ?? null,
        signed_at: data.signed_at ?? null,
      });
      await logIncidentDocumentEvent({
        organization_id: membership.organizationId,
        incident_id: incidentId,
        document_id: doc.id,
        document_type: data.document_type,
        stage,
        event_type: data.signature_url ? "signed" : "uploaded",
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? null,
        file_name: data.file_name,
      });
      return doc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-document-audit", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    },
  });
}

export function useDeleteIncidentDocument(incidentId: string | undefined) {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { id: string; stage?: string; file_name?: string }) => {
      assertOnlineForWrite();
      await deleteIncidentDocument(args.id);
      if (membership?.organizationId && incidentId) {
        await logIncidentDocumentEvent({
          organization_id: membership.organizationId,
          incident_id: incidentId,
          document_id: args.id,
          stage: args.stage ?? null,
          event_type: "deleted",
          actor_user_id: user?.id ?? null,
          actor_name: user?.email ?? null,
          file_name: args.file_name ?? null,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-document-audit", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    },
  });
}

export function useLogIncidentDocumentEvent(incidentId: string | undefined) {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      document_id: string | null;
      stage?: string | null;
      event_type: "uploaded" | "signed" | "downloaded" | "replaced" | "deleted";
      file_name?: string | null;
      notes?: string | null;
    }) => {
      if (!membership?.organizationId || !incidentId) return;
      await logIncidentDocumentEvent({
        organization_id: membership.organizationId,
        incident_id: incidentId,
        document_id: args.document_id,
        stage: args.stage ?? null,
        event_type: args.event_type,
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? null,
        file_name: args.file_name ?? null,
        notes: args.notes ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-document-audit", incidentId] });
    },
  });
}

export function useUpdateIncidentDocumentInvoiceTotal(incidentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, total }: { id: string; total: number | null }) => {
      assertOnlineForWrite();
      return updateIncidentDocumentInvoiceTotal(id, total);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    },
  });
}

export function useIncidentsWithOF286(incidentIds: string[] | undefined) {
  const ids = incidentIds ?? [];
  return useQuery({
    queryKey: ["incident-of286-flags", ids.slice().sort().join(",")],
    queryFn: () => fetchIncidentsWithOF286(ids),
    enabled: ids.length > 0,
  });
}
