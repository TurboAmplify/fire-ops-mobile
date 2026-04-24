import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, subDays, startOfYear } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | null;
  to: Date | null;
  label: string;
}

const PRESETS: { key: string; label: string; build: () => DateRange }[] = [
  { key: "this_week", label: "This Week", build: () => {
    const today = new Date();
    return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }), label: "This Week" };
  }},
  { key: "last_week", label: "Last Week", build: () => {
    const lw = subWeeks(new Date(), 1);
    return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }), label: "Last Week" };
  }},
  { key: "pay_period", label: "Pay Period", build: () => {
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return { from: startOfWeek(subDays(end, 7), { weekStartsOn: 1 }), to: end, label: "Pay Period" };
  }},
  { key: "this_month", label: "This Month", build: () => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today), label: "This Month" };
  }},
  { key: "last_month", label: "Last Month", build: () => {
    const lm = subMonths(new Date(), 1);
    return { from: startOfMonth(lm), to: endOfMonth(lm), label: "Last Month" };
  }},
  { key: "last_30", label: "Last 30 Days", build: () => {
    const today = new Date();
    return { from: subDays(today, 30), to: today, label: "Last 30 Days" };
  }},
  { key: "ytd", label: "Year to Date", build: () => {
    const today = new Date();
    return { from: startOfYear(today), to: today, label: "Year to Date" };
  }},
  { key: "all", label: "All Time", build: () => ({ from: null, to: null, label: "All Time" }) },
];

export function defaultRange(): DateRange {
  return PRESETS[0].build();
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [activeKey, setActiveKey] = useState<string>(() => {
    const match = PRESETS.find((p) => p.build().label === value.label);
    return match?.key ?? "custom";
  });
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from ?? undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to ?? undefined);

  const applyPreset = (key: string) => {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setActiveKey(key);
    onChange(preset.build());
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    setActiveKey("custom");
    onChange({
      from: customFrom,
      to: customTo,
      label: `${format(customFrom, "MMM d")} – ${format(customTo, "MMM d, yyyy")}`,
    });
    setCustomOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-target",
              activeKey === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {p.label}
          </button>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-target",
                activeKey === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              Custom
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-3" align="start">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">From</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  className={cn("p-0 pointer-events-auto")}
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">To</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  className={cn("p-0 pointer-events-auto")}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCustomOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Range: <span className="font-medium text-foreground">{value.label}</span>
        {value.from && value.to && (
          <span className="text-muted-foreground"> · {format(value.from, "MMM d, yyyy")} – {format(value.to, "MMM d, yyyy")}</span>
        )}
      </p>
    </div>
  );
}
