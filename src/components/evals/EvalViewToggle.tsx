import { Eye, FileText } from "lucide-react";

export type EvalView = "easy" | "traditional";

/**
 * Sticky toggle at the top of every eval. Easy read is the default; traditional
 * shows the real ICS-225 layout so the signer can confirm it's the same form.
 */
export function EvalViewToggle({ view, onChange }: { view: EvalView; onChange: (v: EvalView) => void }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
      <div className="flex rounded-xl bg-secondary p-1">
        {([
          { key: "easy" as const, label: "Easy read", icon: Eye },
          { key: "traditional" as const, label: "Traditional form", icon: FileText },
        ]).map((o) => {
          const active = view === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              aria-pressed={active}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                active ? "bg-card text-foreground card-shadow" : "text-muted-foreground"
              }`}
            >
              <o.icon className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {view === "easy"
          ? "Same federal ICS-225 form, laid out for phones. Switch to Traditional to see the real form."
          : "This is the official ICS-225 layout. Tap a cell to set a rating."}
      </p>
    </div>
  );
}
