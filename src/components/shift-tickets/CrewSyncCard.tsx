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

  // Lunch defaults to TRUE — every shift gets a 30-min lunch unless the user
  // explicitly untaps it. If a saved ticket already has personnel entries,
  // restore the lunch state from the first entry's remarks string.
  const [hasLunch, setHasLunch] = useState(true);
  const [lunchTime, setLunchTime] = useState("1200");
  const [lodging, setLodging] = useState(false);
  const [perDiemB, setPerDiemB] = useState(false);
  const [perDiemL, setPerDiemL] = useState(false);
  const [perDiemD, setPerDiemD] = useState(false);

  // M2-M1: Sync local toggles when first personnel entry changes (e.g. after ticket load)
  const first = personnelEntries[0];
  useEffect(() => {
    if (first) {
      setLodging(first.lodging || false);
      setPerDiemB(first.per_diem_b || false);
      setPerDiemL(first.per_diem_l || false);
      setPerDiemD(first.per_diem_d || false);
      // Restore lunch from saved remarks. If a saved entry has no "30-min lunch"
      // marker, the user previously turned it off — respect that choice.
      const lunchMatch = first.remarks?.match(/30-?min lunch at (\d{4})/i);
      if (lunchMatch) {
        setHasLunch(true);
        setLunchTime(lunchMatch[1]);
      } else if (first.remarks) {
        setHasLunch(false);
      }
    }
  }, [first?.lodging, first?.per_diem_b, first?.per_diem_l, first?.per_diem_d, first?.remarks]);

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
        activity_type: "work",
        work_context: "",
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
    `rounded-full px-3 py-1.5 text-xs font-medium touch-target whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`;

  const miniInputClass = "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="space-y-2.5">
      {/* Row 1: Lunch + Lodging */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setHasLunch(!hasLunch)} className={chipClass(hasLunch)}>
          Lunch
        </button>
        <button type="button" onClick={() => setLodging(!lodging)} className={chipClass(lodging)}>
          Lodging
        </button>
        {hasLunch && (
          <div className="w-20 ml-auto">
            <MilitaryTimeInput value={lunchTime} onChange={setLunchTime} className={miniInputClass} />
          </div>
        )}
      </div>

      {/* Row 2: Per Diem */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">Per Diem</span>
        {(["B", "L", "D"] as const).map((meal) => {
          const val = meal === "B" ? perDiemB : meal === "L" ? perDiemL : perDiemD;
          const setter = meal === "B" ? setPerDiemB : meal === "L" ? setPerDiemL : setPerDiemD;
          const label = meal === "B" ? "Breakfast" : meal === "L" ? "Lunch" : "Dinner";
          return (
            <button key={meal} type="button" onClick={() => setter(!val)} className={chipClass(val)} title={label}>
              {meal}
            </button>
          );
        })}
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
        {eqStart && eqStop && (
          <span className="font-normal text-primary-foreground/70">
            {crewTotal}h
          </span>
        )}
      </button>
    </div>
  );
}
