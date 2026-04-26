import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

/**
 * Soft trial / billing notification. Shown in AppShell so it appears
 * everywhere the user navigates. Returns null when there's nothing to say.
 */
export function TrialStatusBanner() {
  const { plan } = usePlan();
  if (!plan?.banner) return null;

  const { variant, title, message, cta } = plan.banner;

  const tone =
    variant === "destructive"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : variant === "warning"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : "bg-primary/10 text-primary border-primary/30";

  const Icon = variant === "destructive" ? AlertCircle : variant === "warning" ? AlertTriangle : Info;

  return (
    <div className={cn("border-b px-4 py-2 text-sm", tone)} role="status">
      <div className="mx-auto flex max-w-3xl items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="text-xs opacity-90">{message}</div>
        </div>
        {cta && (
          <Link
            to={cta.href}
            className="shrink-0 rounded-md border border-current px-2 py-1 text-xs font-medium hover:bg-current/10"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
