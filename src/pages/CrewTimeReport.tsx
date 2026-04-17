import { AppShell } from "@/components/AppShell";
import { FileSpreadsheet } from "lucide-react";

export default function CrewTimeReport() {
  return (
    <AppShell title="Crew Time Report">
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <FileSpreadsheet className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Crew Time Report — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Daily personnel time entry per incident or assignment, with assignment numbers and strike-team grouping.
        </p>
      </div>
    </AppShell>
  );
}
