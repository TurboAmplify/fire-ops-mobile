import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
}

export function AppShell({ children, title, headerRight }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {title && (
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3 safe-area-top">
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          {headerRight}
        </header>
      )}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
