import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  computeHours,
  buildRemarksString,
  splitForLunch,
  normalizeLunchTime,
  type PersonnelEntry,
} from "@/services/shift-tickets";
import { MilitaryTimeInput } from "./MilitaryTimeInput";

interface Props {
  entry: PersonnelEntry;
  index: number;
  onChange: (index: number, updated: PersonnelEntry) => void;
  onRemove: (index: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const DEFAULT_LUNCH = "12:00";

function withLunchRemark(entry: PersonnelEntry): PersonnelEntry {
  const base = buildRemarksString(entry);
  if (entry.lunch_time) {
    return { ...entry, remarks: `${base}, 30-min lunch at ${entry.lunch_time}` };
  }
  return { ...entry, remarks: base };
}

function recalcTotal(entry: PersonnelEntry): number {
  const op = computeHours(entry.op_start, entry.op_stop);
  const sb = computeHours(entry.sb_start, entry.sb_stop);
  return Math.round((op + sb) * 10) / 10;
}

export function PersonnelEntryRow({ entry, index, onChange, onRemove, collapsed, onToggle }: Props) {
  // Lunch dialog (triggered when user enables L meal allowance with no lunch_time set)
  const [lunchDialog, setLunchDialog] = useState(false);
  const [pendingLunchTime, setPendingLunchTime] = useState(DEFAULT_LUNCH);

  // Restore lunch_time from the saved remarks string for legacy entries that
  // don't have the lunch_time field populated yet.
  useEffect(() => {
    if (entry.lunch_time) return;
    const m = entry.remarks?.match(/30-?min lunch at (\d{1,2}:?\d{2})/i);
    if (m) {
      const restored = normalizeLunchTime(m[1]);
      if (restored) onChange(index, { ...entry, lunch_time: restored });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Apply a single field change. When op_start/op_stop change and a lunch
   * is set, auto-split into op + sb segments. When sb fields change manually,
   * just recompute the total.
   */
  const update = (field: keyof PersonnelEntry, value: string | boolean) => {
    let updated: PersonnelEntry = { ...entry, [field]: value };

    const isOpField = field === "op_start" || field === "op_stop";
    const isSbField = field === "sb_start" || field === "sb_stop";

    if (isOpField && updated.lunch_time && updated.op_start && updated.op_stop) {
      const split = splitForLunch(updated.op_start, updated.op_stop, updated.lunch_time);
      updated = {
        ...updated,
        op_start: split.op_start,
        op_stop: split.op_stop,
        sb_start: split.sb_start,
        sb_stop: split.sb_stop,
      };
    }

    if (isOpField || isSbField) {
      updated.total = recalcTotal(updated);
    }

    if (
      ["activity_type", "work_context", "lodging", "per_diem_b", "per_diem_l", "per_diem_d"].includes(
        field as string,
      )
    ) {
      updated = withLunchRemark(updated);
    }

    onChange(index, updated);

    // When the user enables the L (lunch meal) checkbox and no lunch break is
    // set yet, surface the lunch-time dialog so they can confirm or change noon.
    if (field === "per_diem_l" && value === true && !updated.lunch_time) {
      setPendingLunchTime(DEFAULT_LUNCH);
      setLunchDialog(true);
    }
  };

  const applyLunchTime = (newLunch: string | null) => {
    // newLunch === null means "no lunch break" — clear segments.
    let updated: PersonnelEntry = { ...entry, lunch_time: newLunch ?? undefined };
    if (newLunch && entry.op_start && entry.op_stop) {
      const split = splitForLunch(entry.op_start, entry.op_stop, newLunch);
      updated = { ...updated, ...split };
    } else if (!newLunch) {
      // Clearing lunch: collapse SB back into Op stop if SB was the post-lunch segment
      if (entry.sb_stop && entry.op_start) {
        updated = { ...updated, op_stop: entry.sb_stop, sb_start: "", sb_stop: "" };
      }
    }
    updated.total = recalcTotal(updated);
    updated = withLunchRemark(updated);
    onChange(index, updated);
  };

  const handleLunchDialogConfirm = () => {
    const normalized = normalizeLunchTime(pendingLunchTime) || DEFAULT_LUNCH;
    applyLunchTime(normalized);
    setLunchDialog(false);
  };

  const handleLunchToggle = () => {
    if (entry.lunch_time) {
      applyLunchTime(null);
    } else {
      setPendingLunchTime(DEFAULT_LUNCH);
      setLunchDialog(true);
    }
  };

  const handleLunchTimeEdit = () => {
    setPendingLunchTime(entry.lunch_time || DEFAULT_LUNCH);
    setLunchDialog(true);
  };

  const activityType = entry.activity_type || "work";
  const timeInputClass =
    "w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

  // Build badge list
  const badges: string[] = [];
  if (entry.lodging) badges.push("Lodging");
  const meals: string[] = [];
  if (entry.per_diem_b) meals.push("B");
  if (entry.per_diem_l) meals.push("L");
  if (entry.per_diem_d) meals.push("D");
  if (meals.length > 0) badges.push(`Per Diem (${meals.join(",")})`);
  if (entry.lunch_time) badges.push(`Lunch ${entry.lunch_time}`);

  // Summary row (always visible)
  const summaryRow = (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 touch-target"
    >
      <div className="flex flex-col items-start gap-0.5 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold truncate">{entry.operator_name || `Crew ${index + 1}`}</span>
          <span className="text-xs text-muted-foreground shrink-0">{entry.date}</span>
        </div>
        {badges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {badges.map((b) => (
              <span key={b} className="text-[10px] font-medium rounded-full bg-primary/10 text-primary px-2 py-0.5">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-primary">{entry.total || 0}h</span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );

  if (collapsed) {
    return (
      <div className="rounded-xl border border-border bg-card">
        {summaryRow}
        <LunchDialog
          open={lunchDialog}
          value={pendingLunchTime}
          onChange={setPendingLunchTime}
          onConfirm={handleLunchDialogConfirm}
          onCancel={() => setLunchDialog(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {summaryRow}
      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">Edit Crew Row {index + 1}</span>
          <button onClick={() => onRemove(index)} className="text-xs text-destructive touch-target">
            Remove
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">22. Date</label>
            <input
              type="date"
              value={entry.date}
              onChange={(e) => update("date", e.target.value)}
              className={timeInputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">23. Operator Name</label>
            <input
              type="text"
              value={entry.operator_name}
              onChange={(e) => update("operator_name", e.target.value)}
              className={timeInputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">24. Op Start (24h)</label>
            <MilitaryTimeInput
              value={entry.op_start}
              onChange={(v) => update("op_start", v)}
              className={timeInputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">
              25. Op Stop {entry.lunch_time ? "(lunch start)" : "(24h)"}
            </label>
            <MilitaryTimeInput
              value={entry.op_stop}
              onChange={(v) => update("op_stop", v)}
              className={timeInputClass}
            />
          </div>
        </div>

        {/* Lunch break controls — auto-splits Op into Op + SB segments */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-2">
          <button
            type="button"
            onClick={handleLunchToggle}
            className={`rounded-full px-3 py-1.5 text-xs font-medium touch-target ${
              entry.lunch_time
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {entry.lunch_time ? "Lunch on" : "Add lunch break"}
          </button>
          {entry.lunch_time && (
            <button
              type="button"
              onClick={handleLunchTimeEdit}
              className="text-xs font-semibold text-primary underline touch-target"
            >
              At {entry.lunch_time} (30 min)
            </button>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">
            Splits shift into Op + SB
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">
              26. SB Start {entry.lunch_time ? "(post-lunch)" : "(24h)"}
            </label>
            <MilitaryTimeInput
              value={entry.sb_start}
              onChange={(v) => update("sb_start", v)}
              className={timeInputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">
              27. SB Stop {entry.lunch_time ? "(shift end)" : "(24h)"}
            </label>
            <MilitaryTimeInput
              value={entry.sb_stop}
              onChange={(v) => update("sb_stop", v)}
              className={timeInputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">28. Total</label>
            <input
              type="text"
              readOnly
              value={entry.total || ""}
              className="w-full rounded-lg border border-input bg-muted px-2 py-2 text-sm"
            />
          </div>
        </div>

        {/* Structured Remarks */}
        <div className="space-y-2 border-t border-border pt-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">29. Remarks</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update("activity_type", "travel")}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${
                activityType === "travel"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              Travel/Check-In
            </button>
            <button
              type="button"
              onClick={() => update("activity_type", "work")}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium touch-target ${
                activityType === "work"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              Work
            </button>
          </div>
          {activityType === "work" && (
            <div>
              <label className="text-[10px] text-muted-foreground">
                Work Context (e.g. IA2 - Johnson Hill Fire)
              </label>
              <input
                type="text"
                value={entry.work_context || ""}
                onChange={(e) => update("work_context", e.target.value)}
                placeholder="IA2 - Fire Name"
                className={timeInputClass}
              />
            </div>
          )}
          <label className="flex items-center gap-2 touch-target">
            <input
              type="checkbox"
              checked={entry.lodging || false}
              onChange={(e) => update("lodging", e.target.checked)}
              className="h-5 w-5 rounded border-input accent-primary"
            />
            <span className="text-sm">Lodging</span>
          </label>
          <div>
            <span className="text-[10px] text-muted-foreground">Per Diem</span>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1.5 touch-target">
                <input
                  type="checkbox"
                  checked={entry.per_diem_b || false}
                  onChange={(e) => update("per_diem_b", e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium">B</span>
              </label>
              <label className="flex items-center gap-1.5 touch-target">
                <input
                  type="checkbox"
                  checked={entry.per_diem_l || false}
                  onChange={(e) => update("per_diem_l", e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium">L</span>
              </label>
              <label className="flex items-center gap-1.5 touch-target">
                <input
                  type="checkbox"
                  checked={entry.per_diem_d || false}
                  onChange={(e) => update("per_diem_d", e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium">D</span>
              </label>
            </div>
          </div>
          {entry.remarks && (
            <p className="text-[10px] text-muted-foreground italic">{entry.remarks}</p>
          )}
        </div>
      </div>

      <LunchDialog
        open={lunchDialog}
        value={pendingLunchTime}
        onChange={setPendingLunchTime}
        onConfirm={handleLunchDialogConfirm}
        onCancel={() => setLunchDialog(false)}
      />
    </div>
  );
}

interface LunchDialogProps {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function LunchDialog({ open, value, onChange, onConfirm, onCancel }: LunchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Lunch break time</DialogTitle>
          <DialogDescription>
            Default is noon (12:00). The shift will split into pre-lunch (Op) and post-lunch (SB)
            segments with a 30-minute break.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="text-[11px] font-medium text-muted-foreground">Lunch start (24h)</label>
          <MilitaryTimeInput
            value={value}
            onChange={onChange}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus:ring-1 focus:ring-ring mt-1"
          />
        </div>
        <DialogFooter className="flex flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 sm:flex-none">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
