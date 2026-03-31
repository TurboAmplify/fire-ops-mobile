import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ChevronLeft, Flame } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
  showBack?: boolean;
}

export function AppShell({ children, title, headerRight, showBack }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isNested = showBack ?? (location.pathname.split("/").filter(Boolean).length > 1);
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {title && (
        <header className={`sticky top-0 z-40 safe-area-top ${
          isHome
            ? "fire-gradient"
            : "glass border-b border-border/60 bg-card/80"
        }`}>
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {isNested && (
                <button
                  onClick={() => navigate(-1)}
                  className={`flex items-center justify-center -ml-2 mr-1 h-9 w-9 rounded-full transition-colors ${
                    isHome
                      ? "text-white/90 active:bg-white/10"
                      : "text-primary active:bg-primary/10"
                  }`}
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {isHome && (
                <Flame className="h-5 w-5 text-white/90 mr-1 shrink-0" />
              )}
              <h1 className={`text-[17px] font-bold tracking-tight truncate ${
                isHome ? "text-white" : ""
              }`}>{title}</h1>
            </div>
            {headerRight && <div className="flex items-center gap-1.5 shrink-0">{headerRight}</div>}
          </div>
        </header>
      )}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
