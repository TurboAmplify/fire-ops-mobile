import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
}

export function AppShell({ children, title, headerRight }: AppShellProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {title && (
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground touch-target"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
      )}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
