import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { TrialStatusBanner } from "./billing/TrialStatusBanner";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import fireLogo from "@/assets/fire-logo.png";
import { useAppBackground } from "@/hooks/useAppBackground";
import { NotificationBell } from "./notifications/NotificationBell";

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
  const { src: bgSrc, variant } = useAppBackground();

  const isNested = showBack ?? (location.pathname.split("/").filter(Boolean).length > 1);
  const isHome = location.pathname === "/";
  const showBackdrop = variant !== "hero";

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {showBackdrop && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-[0.12] dark:opacity-20"
          style={{ backgroundImage: `url(${bgSrc})` }}
        />
      )}
      <div className="relative z-10 flex min-h-dvh flex-col">
      {title ? (
        <>
          <header className={`fixed top-0 left-0 right-0 z-50 pt-[var(--app-safe-top)] ${
            isHome
              ? "bg-background/95 glass border-b border-border/40"
              : "glass border-b border-border/60 bg-card/80"
          }`}>
            <div className="flex min-h-14 items-center justify-between px-4 py-1.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isNested && (
                  <button
                    onClick={() => onBack ? onBack() : navigate(-1)}
                    className="flex items-center justify-center -ml-2 mr-0.5 h-11 w-11 rounded-full text-primary active:bg-primary/10 transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                {isHome && (
                  <img src={fireLogo} alt="" className="h-7 w-7 shrink-0" width={512} height={512} />
                )}
                <h1 className="text-[17px] font-bold tracking-tight truncate">{title}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 [&_a]:min-h-11 [&_button]:min-h-11">
                <NotificationBell />
                {headerRight}
              </div>

            </div>
          </header>
          {/* Spacer must include the iOS safe-area inset so content doesn't slide under the notch / Dynamic Island. */}
          <div className="shrink-0 h-[calc(3.5rem+var(--app-safe-top))]" />
        </>
      ) : (
        // Pages without a title still need top inset on iOS or they render under the camera bar.
        <div className="shrink-0 h-[var(--app-safe-top)]" />
      )}
      <OfflineBanner />
      <TrialStatusBanner />
      <main className="flex-1 pb-24">
        {children}
      </main>
      <BottomNav />
      </div>
    </div>
  );
}
