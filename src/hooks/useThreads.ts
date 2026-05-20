import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import {
  createThread,
  getDraft,
  getThread,
  listThreads,
  markThreadRead,
  saveDraft,
  sendReply,
  unreadTotal,
  type ThreadPurpose,
} from "@/services/threads";

export function useThreadList(opts: { incidentId?: string } = {}) {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const qc = useQueryClient();

  // Realtime: invalidate on any thread change for this org.
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`threads:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "communication_threads", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["threads", orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, qc]);

  return useQuery({
    queryKey: ["threads", orgId, opts.incidentId ?? "all"],
    queryFn: () => listThreads({ organizationId: orgId!, incidentId: opts.incidentId }),
    enabled: !!orgId,
  });
}

export function useUnreadTotal() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  return useQuery({
    queryKey: ["threads-unread", orgId],
    queryFn: () => unreadTotal(orgId!),
    enabled: !!orgId,
    refetchInterval: 60_000,
  });
}

export function useThread(threadId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["thread", threadId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId, qc]);

  return useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getThread(threadId!),
    enabled: !!threadId,
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads", membership?.organizationId] });
      qc.invalidateQueries({ queryKey: ["threads-unread", membership?.organizationId] });
    },
  });
}

export function useSendReply(threadId: string | undefined) {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (bodyText: string) => sendReply(threadId!, bodyText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
      qc.invalidateQueries({ queryKey: ["threads", membership?.organizationId] });
    },
  });
}

export function useDraft(threadId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["thread-draft", threadId, user?.id],
    queryFn: () => getDraft(threadId!, user!.id),
    enabled: !!threadId && !!user?.id,
  });
}

export function useSaveDraft() {
  const { user } = useAuth();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      saveDraft(threadId, user!.id, membership!.organizationId, body),
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { membership } = useOrganization();
  return useMutation({
    mutationFn: (input: {
      incidentId?: string | null;
      incidentTruckId?: string | null;
      contactId?: string | null;
      financeOfficerId?: string | null;
      purpose: ThreadPurpose;
      subject: string;
    }) =>
      createThread({
        organizationId: membership!.organizationId,
        createdByUserId: user?.id ?? null,
        ...input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads", membership?.organizationId] });
    },
  });
}
