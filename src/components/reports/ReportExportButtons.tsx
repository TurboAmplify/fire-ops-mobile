import { useState } from "react";
import { Loader2, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Format = "pdf" | "csv" | "excel";

interface Props {
  /** Single async handler; receives the chosen format */
  onExport: (fmt: Format) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  /** Hide individual buttons if not applicable */
  hide?: Partial<Record<Format, boolean>>;
}

const META: Record<Format, { label: string; icon: typeof FileText }> = {
  pdf: { label: "PDF", icon: FileText },
  excel: { label: "Excel", icon: FileSpreadsheet },
  csv: { label: "CSV", icon: FileDown },
};

export function ReportExportButtons({ onExport, disabled, className, hide }: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const { toast } = useToast();

  const handle = async (fmt: Format) => {
    if (busy || disabled) return;
    setBusy(fmt);
    try {
      await onExport(fmt);
    } catch (err) {
      console.error("Export failed:", err);
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not generate report.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const formats: Format[] = (["pdf", "excel", "csv"] as Format[]).filter((f) => !hide?.[f]);

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {formats.map((fmt) => {
        const { label, icon: Icon } = META[fmt];
        const isBusy = busy === fmt;
        return (
          <button
            key={fmt}
            type="button"
            disabled={disabled || !!busy}
            onClick={() => handle(fmt)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium",
              "transition-colors active:scale-[0.98] touch-target",
              "disabled:opacity-50 disabled:pointer-events-none hover:bg-accent",
            )}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Icon className="h-4 w-4 text-primary" />
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
