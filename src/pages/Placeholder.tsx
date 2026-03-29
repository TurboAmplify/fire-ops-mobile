import { AppShell } from "@/components/AppShell";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppShell title={title}>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm mt-1">Coming soon</p>
      </div>
    </AppShell>
  );
}
