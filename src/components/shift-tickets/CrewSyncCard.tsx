import { useState, useEffect } from "react";
import { Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { MilitaryTimeInput } from "./MilitaryTimeInput";
import { computeHours, buildRemarksString } from "@/services/shift-tickets";
import type { EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";

interface CrewSyncCardProps {
  equipmentEntries: EquipmentEntry[];
  personnelEntries: PersonnelEntry[];
  setPersonnelEntries: React.Dispatch<React.SetStateAction<PersonnelEntry[]>>;
}

export function CrewSyncCard({ equipmentEntries, personnelEntries, setPersonnelEntries }: CrewSyncCardProps) {
  const primary = equipmentEntries[0];
  const eqStart = primary?.start || "";
  const eqStop = primary?.stop || "";
  const eqDate = primary?.date || "";
  const eqTotal = computeHours(eqStart, eqStop);

  // Lunch break state
  const [hasLunch, setHasLunch] = useState(false);
  const [lunchTime, setLunchTime] = useState("1200");

  // Auto-check lunch when equipment shift > 8h
  useEffect(() => {
    setHasLunch(eqTotal > 8);
  }, [eqTotal]);

  // Activity / per-diem state
  const firstEntry = personnelEntries[0];
  const [activity, setActivity] = useState<"travel" | "work">(firstEntry?.activity_type || "work");
  const [workContext, setWorkContext] = useState(firstEntry?.work_context || "");
  const [lodging, setLodging] = useState(firstEntry?.lodging || false);
  const [perDiemB, setPerDiemB] = useState(firstEntry?.per_diem_b || false);
  const [perDiemL, setPerDiemL] = useState(firstEntry?.per_diem_l || false);
  const [perDiemD, setPerDiemD] = useState(firstEntry?.per_diem_d || false);

  const crewTotal = hasLunch ? Math.round((eqTotal - 0.5) * 10) / 10 : eqTotal;

  const applyToAll = () => {
    if (!eqStart || !eqStop) {
      toast.error("Enter equipment start and stop times first");
      return;
    }

    const updated = personnelEntries.map((entry) => {
      // Explicitly compute hours for each crew member
      const opHours = computeHours(eqStart, eqStop);
      const finalTotal = hasLunch ? Math.round((opHours - 0.5) * 10) / 10 : opHours;
      const newEntry: PersonnelEntry = {
        ...entry,
        date: eqDate || entry.date,
        op_start: eqStart,
        op_stop: eqStop,
        sb_start: "",
        sb_stop: "",
        total: finalTotal,
        activity_type: activity,
        work_context: activity === "work" ? workContext : "",
        lodging,
        per_diem_b: perDiemB,
        per_diem_l: perDiemL,
        per_diem_d: perDiemD,
      };
      newEntry.remarks = buildRemarksString(newEntry);
      if (hasLunch) {
        newEntry.remarks += `, 30-min lunch at ${lunchTime}`;
      }
      return newEntry;
    });

    setPersonnelEntries(updated);
    toast.success(`Synced times to ${updated.length} crew members`);
  };

  const inputClass = "w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-primary">Sync Crew from Equipment</span>
      </div>

      {/* Equipment time readout */}
      <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
        <p className="text-[10px] text-muted-foreground mb-0.5">Equipment Times</p>
        {eqStart && eqStop ? (
          <p className="text-sm font-semibold">
            {eqStart} - {eqStop}{" "}
            <span className="text-muted-foreground font-normal">({eqTotal}h)</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Enter equipment times above</p>
        )}
      </div>

      {/* Lunch break */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 touch-target">
          <input
            type="checkbox"
            checked={hasLunch}
            onChange={(e) => setHasLunch(e.target.checked)}
            className="h-5 w-5 rounded border-input accent-primary"
          />
          <span className="text-sm">30-min lunch break</span>
          {eqTotal > 8 && (
            <span className="text-[10px] text-muted-foreground">(recommended for 8h+ shifts)</span>
          )}
        </label>

        {hasLunch && (
          <div className="pl-7">
            <label className="text-[10px] text-muted-foreground">Lunch at (24h)</label>
            <MilitaryTimeInput value={lunchTime} onChange={setLunchTime} className={inputClass} />
            {eqStart && eqStop && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Crew total: {crewTotal}h (equipment {eqTotal}h - 0.5h lunch)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Activity type */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActivity("travel")}
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${activity === "travel" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          Travel/Check-In
        </button>
        <button
          type="button"
          onClick={() => setActivity("work")}
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${activity === "work" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          Work
        </button>
      </div>

      {/* Work context */}
      {activity === "work" && (
        <div>
          <label className="text-[10px] text-muted-foreground">Work Context (e.g. IA2 - Fire Name)</label>
          <input
            type="text"
            value={workContext}
            onChange={(e) => setWorkContext(e.target.value)}
            placeholder="IA2 - Fire Name"
            className={inputClass}
          />
        </div>
      )}

      {/* Lodging */}
      <label className="flex items-center gap-2 touch-target">
        <input
          type="checkbox"
          checked={lodging}
          onChange={(e) => setLodging(e.target.checked)}
          className="h-5 w-5 rounded border-input accent-primary"
        />
        <span className="text-sm">Lodging</span>
      </label>

      {/* Per Diem */}
      <div className="flex gap-3">
        <span className="text-[10px] text-muted-foreground self-center">Per Diem:</span>
        {([["B", perDiemB, setPerDiemB], ["L", perDiemL, setPerDiemL], ["D", perDiemD, setPerDiemD]] as const).map(
          ([label, val, setter]) => (
            <label key={label} className="flex items-center gap-1.5 touch-target">
              <input
                type="checkbox"
                checked={val as boolean}
                onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                className="h-5 w-5 rounded border-input accent-primary"
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          )
        )}
      </div>

      {/* Apply button */}
      <button
        type="button"
        onClick={applyToAll}
        disabled={!eqStart || !eqStop}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground touch-target active:scale-[0.98] disabled:opacity-40"
      >
        <Clock className="h-4 w-4" />
        Apply to All Crew ({personnelEntries.length})
      </button>
    </div>
  );
}
