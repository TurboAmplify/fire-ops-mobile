import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useIncidents } from "@/hooks/useIncidents";

interface Props {
  crewId: string;            // "all" or crew member id
  incidentIds: string[];     // [] = all incidents, otherwise specific ids
  onChange: (next: { crewId: string; incidentIds: string[] }) => void;
  showCrew?: boolean;
  showIncident?: boolean;
}

export function ScopePicker({ crewId, incidentIds, onChange, showCrew = true, showIncident = true }: Props) {
  const { data: crew } = useCrewMembers();
  const { data: incidents } = useIncidents();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const incidentList = incidents ?? [];
  const allIncidents = incidentIds.length === 0;
  const selectedSet = new Set(incidentIds);

  const toggleIncident = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ crewId, incidentIds: Array.from(next) });
  };

  const selectAll = () => onChange({ crewId, incidentIds: [] });

  const buttonLabel = (() => {
    if (allIncidents) return "All incidents";
    if (incidentIds.length === 1) {
      return incidentList.find((i) => i.id === incidentIds[0])?.name ?? "1 selected";
    }
    return `${incidentIds.length} selected`;
  })();

  return (
    <div className="grid grid-cols-2 gap-2">
      {showCrew && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Crew</span>
          <select
            value={crewId}
            onChange={(e) => onChange({ crewId: e.target.value, incidentIds })}
            className="rounded-xl border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
          >
            <option value="all">All crew</option>
            {(crew ?? []).filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {showIncident && (
        <div className="relative flex flex-col gap-1" ref={popRef}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Incident</span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between rounded-xl border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target text-left"
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          {open && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-xl border bg-popover shadow-lg">
              <button
                type="button"
                onClick={selectAll}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-accent border-b"
              >
                <span className="font-medium">All incidents</span>
                {allIncidents && <Check className="h-4 w-4 text-primary" />}
              </button>
              {incidentList.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">No incidents</p>
              )}
              {incidentList.map((i) => {
                const checked = selectedSet.has(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => toggleIncident(i.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
                  >
                    <span className="truncate">{i.name}</span>
                    {checked && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          {!allIncidents && incidentIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {incidentIds.slice(0, 3).map((id) => {
                const inc = incidentList.find((i) => i.id === id);
                if (!inc) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] text-primary">
                    {inc.name}
                    <button type="button" onClick={() => toggleIncident(id)} aria-label={`Remove ${inc.name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {incidentIds.length > 3 && (
                <span className="text-[11px] text-muted-foreground self-center">+{incidentIds.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
