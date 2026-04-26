import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  label: string;
  /** Right-side actions shown next to the label (e.g. Upload, New). */
  actions?: ReactNode;
  /** When true, renders inside a collapsible. Defaults to false (always-open). */
  collapsible?: boolean;
  /** Initial open state for collapsible sections. */
  defaultOpen?: boolean;
  /** Subtle visual emphasis on the label color. */
  tone?: "default" | "muted";
  children: ReactNode;
}

/**
 * Standardized section wrapper used across the Incident Detail screen so
 * every block (OF-286, Agreements, Trucks, Daily Crew, etc.) has the same
 * header rhythm: small uppercase label on the left, optional actions on the right.
 */
export function IncidentSection({
  label,
  actions,
  collapsible = false,
  defaultOpen = true,
  tone = "default",
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wider " +
    (tone === "muted" ? "text-muted-foreground/70" : "text-muted-foreground");

  if (!collapsible) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 min-h-[28px]">
          <p className={labelClass}>{label}</p>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
        {children}
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <div className="flex items-center justify-between gap-3 min-h-[28px]">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 touch-target text-left min-w-0">
          <p className={labelClass + " truncate"}>{label}</p>
          <ChevronRight
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${
              open ? "rotate-90" : ""
            }`}
          />
        </CollapsibleTrigger>
        {actions && open && (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        )}
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
