import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useIncidents } from "@/hooks/useIncidents";

interface Props {
  crewId: string;       // "all" or crew member id
  incidentId: string;   // "all" or incident id
  onChange: (next: { crewId: string; incidentId: string }) => void;
  showCrew?: boolean;
  showIncident?: boolean;
}

export function ScopePicker({ crewId, incidentId, onChange, showCrew = true, showIncident = true }: Props) {
  const { data: crew } = useCrewMembers();
  const { data: incidents } = useIncidents();

  return (
    <div className="grid grid-cols-2 gap-2">
      {showCrew && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Crew</span>
          <select
            value={crewId}
            onChange={(e) => onChange({ crewId: e.target.value, incidentId })}
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
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Incident</span>
          <select
            value={incidentId}
            onChange={(e) => onChange({ crewId, incidentId: e.target.value })}
            className="rounded-xl border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring touch-target"
          >
            <option value="all">All incidents</option>
            {(incidents ?? []).map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
