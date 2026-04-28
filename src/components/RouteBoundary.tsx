import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary, RouteErrorFallback } from "@/components/ErrorBoundary";

/**
 * Per-route error boundary. Resets automatically when the route changes
 * by keying on pathname so a broken page doesn't stay broken after navigating away.
 */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary
      key={location.pathname}
      scope={location.pathname}
      fallback={(reset, error) => <RouteErrorFallback reset={reset} error={error} />}
    >
      {children}
    </ErrorBoundary>
  );
}
