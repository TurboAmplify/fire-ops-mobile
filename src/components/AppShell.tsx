import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import fireLogo from "@/assets/fire-logo.png";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function AppShell({ children, title, headerRight, showBack, onBack }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isNested = showBack ?? (location.pathname.split("/").filter(Boolean).length > 1);
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {title && (
        <>
          <header className={`fixed top-0 left-0 right-0 z-50 safe-area-top ${
            isHome
              ? "bg-background/95 glass border-b border-border/40"
              : "glass border-b border-border/60 bg-card/80"
          }`}>
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isNested && (
                  <button
                    onClick={() => onBack ? onBack() : navigate(-1)}
                    className="flex items-center justify-center -ml-2 mr-0.5 h-9 w-9 rounded-full text-primary active:bg-primary/10 transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {isHome && (
                  <img src={fireLogo} alt="" className="h-7 w-7 shrink-0" width={512} height={512} />
                )}
                <h1 className="text-[17px] font-bold tracking-tight truncate">{title}</h1>
              </div>
              {headerRight && <div className="flex items-center gap-1.5 shrink-0">{headerRight}</div>}
            </div>
          </header>
          <div className="h-14 shrink-0" />
        </>
      )}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
