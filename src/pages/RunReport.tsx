import { AppShell } from "@/components/AppShell";
import { ClipboardList } from "lucide-react";

export default function RunReport() {
  return (
    <AppShell title="Run Reports">
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <ClipboardList className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Run Reports — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          NFIRS-style call reports for local incident response. Track dispatch, on-scene, and clear times,
          units responding, and a quick narrative.
        </p>
      </div>
    </AppShell>
  );
}
