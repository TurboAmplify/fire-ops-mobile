import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { useMyRedCard, useRedCardsEnabled } from "@/hooks/useRedCards";
import { useAuth } from "@/hooks/useAuth";
import { RedCardCard } from "@/components/crew/RedCardCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MyRedCard() {
  const navigate = useNavigate();
  const enabled = useRedCardsEnabled();
  const { user } = useAuth();
  const { data: card, isLoading, error } = useMyRedCard();

  // Resolve member name (display purposes)
  const { data: member } = useQuery({
    queryKey: ["my-crew-member-name", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("crew_member_id, full_name")
        .eq("id", user!.id)
        .maybeSingle();
      const cmId = (profile as any)?.crew_member_id;
      if (!cmId) return { name: profile?.full_name ?? "You" };
      const { data: cm } = await supabase
        .from("crew_members")
        .select("name")
        .eq("id", cmId)
        .maybeSingle();
      return { name: cm?.name ?? profile?.full_name ?? "You" };
    },
  });

  return (
    <AppShell title="My Red Card" showBack onBack={() => navigate("/more")}>
      <div className="p-4 space-y-4">
        {!enabled && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Red Cards aren't enabled for your organization.</p>
            <p className="mt-1 text-xs text-muted-foreground">Ask an admin to enable this feature.</p>
          </div>
        )}

        {enabled && isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {enabled && !isLoading && error && (
          <p className="py-8 text-center text-sm text-destructive">Failed to load your Red Card.</p>
        )}

        {enabled && !isLoading && !error && !card && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No Red Card on file yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Contact your admin to have your Incident Qualification Card added.
            </p>
          </div>
        )}

        {enabled && !isLoading && card && (
          <RedCardCard card={card} memberName={member?.name ?? "You"} />
        )}
      </div>
    </AppShell>
  );
}
