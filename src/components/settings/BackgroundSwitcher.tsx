import { useAppBackground, BACKGROUND_OPTIONS, BackgroundVariant } from "@/hooks/useAppBackground";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function BackgroundSwitcher() {
  const { variant, setBackground, isSaving, isLoading } = useAppBackground();

  const handlePick = async (id: BackgroundVariant) => {
    if (id === variant || isSaving) return;
    try {
      await setBackground(id);
      toast({ title: "Background updated", description: "Every user will see the new background." });
    } catch (err: any) {
      toast({
        title: "Could not update background",
        description: err.message ?? "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">App Background</CardTitle>
        <CardDescription>
          Cinematic backdrop shown on the login screen and across the app. Applies to every user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BACKGROUND_OPTIONS.map((opt) => {
              const selected = opt.id === variant;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePick(opt.id)}
                  disabled={isSaving}
                  className={`group relative overflow-hidden rounded-lg border text-left transition-all ${
                    selected
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border hover:border-primary/40"
                  } ${isSaving ? "opacity-60" : ""}`}
                >
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={opt.src}
                      alt={opt.label}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-0.5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{opt.label}</span>
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
