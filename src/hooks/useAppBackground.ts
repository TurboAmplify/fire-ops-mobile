import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";
import fireFlagBg from "@/assets/bg-fire-flag.jpg";
import smokeStripeBg from "@/assets/bg-smoke-stripe.jpg";

export type BackgroundVariant = "hero" | "fire-flag" | "smoke-stripe";

export const BACKGROUND_OPTIONS: {
  id: BackgroundVariant;
  label: string;
  description: string;
  src: string;
}[] = [
  { id: "hero", label: "Hero (default)", description: "Original wildfire hero image", src: heroBg },
  { id: "fire-flag", label: "Fire Flag", description: "Cinematic burning American flag with red stripe", src: fireFlagBg },
  { id: "smoke-stripe", label: "Smoke & Stripe", description: "Wavy black/gray smoke with a red stripe", src: smokeStripeBg },
];

export function backgroundSrc(variant: BackgroundVariant): string {
  return BACKGROUND_OPTIONS.find((o) => o.id === variant)?.src ?? heroBg;
}

export function useAppBackground() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["platform_settings", "app_background"],
    queryFn: async (): Promise<BackgroundVariant> => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .select("value")
        .eq("key", "app_background")
        .maybeSingle();
      if (error) throw error;
      const v = (data as any)?.value?.variant as BackgroundVariant | undefined;
      return v ?? "hero";
    },
    staleTime: 60_000,
  });

  const setBackground = useMutation({
    mutationFn: async (variant: BackgroundVariant) => {
      const { error } = await supabase
        .from("platform_settings" as any)
        .upsert({ key: "app_background", value: { variant } } as any, { onConflict: "key" });
      if (error) throw error;
      return variant;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_settings", "app_background"] });
    },
  });

  return {
    variant: query.data ?? "hero",
    src: backgroundSrc(query.data ?? "hero"),
    isLoading: query.isLoading,
    setBackground: setBackground.mutateAsync,
    isSaving: setBackground.isPending,
  };
}
