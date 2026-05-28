import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  organization_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  thread_id: string | null;
  incident_id: string | null;
  incident_truck_id: string | null;
  incident_document_id: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

const KEY = (orgId: string | undefined) => ["app_notifications", orgId ?? "_"];

export function useAppNotifications() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId;
  const qc = useQueryClient();
  const seenToastIds = useRef<Set<string>>(new Set());

  const list = useQuery({
    queryKey: KEY(orgId),
    enabled: !!orgId,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("app_notifications")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  // Realtime: refresh on insert + toast new ones.
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`app_notifications:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          if (!seenToastIds.current.has(row.id)) {
            seenToastIds.current.add(row.id);
            toast(row.title, { description: row.body ?? undefined });
          }
          qc.invalidateQueries({ queryKey: KEY(orgId) });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_notifications",
          filter: `organization_id=eq.${orgId}`,
        },
        () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);

  const items = list.data ?? [];
  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!orgId) return;
      const { error } = await supabase
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });

  return {
    items,
    unreadCount,
    isLoading: list.isLoading,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}
