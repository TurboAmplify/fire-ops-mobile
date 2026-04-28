import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { logError } from "@/lib/error-tracking";

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void, error: Error) => ReactNode;
  /** Label to identify where in the app the boundary is mounted (e.g. route name). */
  scope?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void logError({
      message: `[${this.props.scope ?? "app"}] ${error.message}`,
      stack: error.stack ?? info.componentStack ?? null,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.reset, this.state.error);
      }
      return <DefaultFallback reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The screen ran into an unexpected problem. Your data is safe.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload app
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.href = "/support";
            }}
          >
            Report issue
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RouteErrorFallback({ reset }: { reset: () => void; error: Error }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-base font-semibold">This page failed to load</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You can keep using the rest of the app.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={reset}>Try again</Button>
          <Button size="sm" variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              window.location.href = "/support";
            }}
          >
            Report issue
          </Button>
        </div>
      </div>
    </div>
  );
}
