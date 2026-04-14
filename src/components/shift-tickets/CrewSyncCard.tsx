import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
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

  const [hasLunch, setHasLunch] = useState(false);
  const [lunchTime, setLunchTime] = useState("1200");
  const [activity, setActivity] = useState<"travel" | "work">("work");
  const [workContext, setWorkContext] = useState("");
  const [lodging, setLodging] = useState(false);
  const [perDiemB, setPerDiemB] = useState(false);
  const [perDiemL, setPerDiemL] = useState(false);
  const [perDiemD, setPerDiemD] = useState(false);

  // Init from first personnel entry
  useEffect(() => {
    const first = personnelEntries[0];
    if (first) {
      setActivity(first.activity_type || "work");
      setWorkContext(first.work_context || "");
      setLodging(first.lodging || false);
      setPerDiemB(first.per_diem_b || false);
      setPerDiemL(first.per_diem_l || false);
      setPerDiemD(first.per_diem_d || false);
    }
  }, []);

  useEffect(() => {
    setHasLunch(eqTotal > 8);
  }, [eqTotal]);

  const crewTotal = hasLunch ? Math.round((eqTotal - 0.5) * 10) / 10 : eqTotal;

  const applyToAll = () => {
    if (!eqStart || !eqStop) {
      toast.error("Enter equipment start and stop times first");
      return;
    }
    const updated = personnelEntries.map((entry) => {
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

  const chipClass = (active: boolean) =>
    `rounded-full px-2.5 py-1.5 text-[11px] font-medium touch-target whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`;

  const miniInputClass = "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => setActivity(activity === "travel" ? "work" : "travel")} className={chipClass(activity === "travel")}>
          {activity === "travel" ? "Travel" : "Work"}
        </button>
        <button type="button" onClick={() => setHasLunch(!hasLunch)} className={chipClass(hasLunch)}>
          Lunch
        </button>
        <button type="button" onClick={() => setLodging(!lodging)} className={chipClass(lodging)}>
          Lodging
        </button>
        <span className="w-px h-4 bg-border" />
        {(["B", "L", "D"] as const).map((meal) => {
          const val = meal === "B" ? perDiemB : meal === "L" ? perDiemL : perDiemD;
          const setter = meal === "B" ? setPerDiemB : meal === "L" ? setPerDiemL : setPerDiemD;
          return (
            <button key={meal} type="button" onClick={() => setter(!val)} className={chipClass(val)}>
              {meal}
            </button>
          );
        })}
      </div>

      {/* Row 2: Conditional inputs */}
      {(activity === "work" || hasLunch) && (
        <div className="flex gap-2">
          {activity === "work" && (
            <div className="flex-1">
              <input type="text" value={workContext} onChange={(e) => setWorkContext(e.target.value)}
                placeholder="IA2 - Fire Name" className={miniInputClass} />
            </div>
          )}
          {hasLunch && (
            <div className="w-20">
              <MilitaryTimeInput value={lunchTime} onChange={setLunchTime} className={miniInputClass} />
            </div>
          )}
        </div>
      )}

      {/* Apply button */}
      <button
        type="button"
        onClick={applyToAll}
        disabled={!eqStart || !eqStop}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground touch-target active:scale-[0.98] disabled:opacity-40"
      >
        <Clock className="h-4 w-4" />
        Apply to All Crew ({personnelEntries.length})
        {eqStart && eqStop && (
          <span className="font-normal text-primary-foreground/70">
            {crewTotal}h
          </span>
        )}
      </button>
    </div>
  );
}
