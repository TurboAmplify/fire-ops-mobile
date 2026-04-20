import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { Truck } from "@/services/fleet";
import { TRUCK_STATUS_LABELS, type TruckStatus } from "@/services/fleet";

interface TruckInfoSectionProps {
  truck: Truck;
  onStatusChange?: (status: TruckStatus) => void;
  isUpdatingStatus?: boolean;
}

const STATUS_OPTIONS: TruckStatus[] = ["available", "deployed", "maintenance", "needs_attention"];

export function TruckInfoSection({ truck, onStatusChange, isUpdatingStatus }: TruckInfoSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const t = truck as any;
  const status = truck.status as TruckStatus;

  const statusColors: Record<TruckStatus, string> = {
    available: "bg-success/15 text-success",
    deployed: "bg-primary/15 text-primary",
    maintenance: "bg-warning/15 text-warning",
    needs_attention: "bg-destructive/15 text-destructive",
  };

  const sections = [
    {
      title: "Vehicle Identification",
      items: [
        { label: "Unit Type", value: truck.unit_type },
        { label: "Make", value: truck.make },
        { label: "Model", value: truck.model },
        { label: "Year", value: truck.year },
        { label: "VIN", value: truck.vin },
        { label: "Plate", value: truck.plate },
        { label: "Engine", value: t.engine_type },
        { label: "Bed Length", value: t.bed_length },
      ],
    },
    {
      title: "Weight & Capacity",
      items: [
        { label: "Weight (Empty)", value: t.weight_empty ? `${Number(t.weight_empty).toLocaleString()} lbs` : null },
        { label: "Weight (Full)", value: t.weight_full ? `${Number(t.weight_full).toLocaleString()} lbs` : null },
        { label: "GVWR", value: t.gvwr ? `${Number(t.gvwr).toLocaleString()} lbs` : null },
        { label: "Water Capacity", value: truck.water_capacity },
        { label: "Fuel Capacity", value: t.fuel_capacity ? `${t.fuel_capacity} gal` : null },
        { label: "Fuel Type", value: t.fuel_type },
        { label: "Pump Type", value: truck.pump_type },
      ],
    },
    {
      title: "Compliance & Docs",
      items: [
        { label: "DOT Number", value: truck.dot_number },
        { label: "Registration Exp.", value: t.registration_expiry ? format(new Date(t.registration_expiry), "MMM d, yyyy") : null },
        { label: "Insurance Exp.", value: t.insurance_expiry ? format(new Date(t.insurance_expiry), "MMM d, yyyy") : null },
      ],
    },
    {
      title: "Maintenance",
      items: [
        { label: "Current Mileage", value: truck.current_mileage ? `${truck.current_mileage.toLocaleString()} mi` : null },
        { label: "Last Oil Change", value: t.last_oil_change_date ? format(new Date(t.last_oil_change_date), "MMM d, yyyy") : null },
        { label: "Oil Change Mileage", value: t.last_oil_change_mileage ? `${Number(t.last_oil_change_mileage).toLocaleString()} mi` : null },
        { label: "Next Oil Change", value: t.next_oil_change_mileage ? `${Number(t.next_oil_change_mileage).toLocaleString()} mi` : null },
      ],
    },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl bg-card card-shadow overflow-hidden">
        <div className="flex w-full items-center justify-between p-4">
          <CollapsibleTrigger className="flex items-center gap-3 min-w-0 flex-1 touch-target text-left">
            <h2 className="text-lg font-bold truncate">{truck.name}</h2>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onStatusChange) setShowStatusPicker((v) => !v);
            }}
            disabled={!onStatusChange || isUpdatingStatus}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shrink-0 ml-2 ${statusColors[status]} ${onStatusChange ? "active:opacity-70" : ""}`}
          >
            {TRUCK_STATUS_LABELS[status] ?? truck.status}
          </button>
        </div>

        {showStatusPicker && onStatusChange && (
          <div className="px-4 pb-3 -mt-1 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-2">Change status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onStatusChange(s);
                    setShowStatusPicker(false);
                  }}
                  disabled={isUpdatingStatus}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold touch-target ${
                    s === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground active:opacity-70"
                  }`}
                >
                  {s === status && <Check className="h-3 w-3" />}
                  {TRUCK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {sections.map((section) => {
              const filled = section.items.filter((i) => i.value);
              if (filled.length === 0) return null;
              return (
                <div key={section.title}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {filled.map((d) => (
                      <div key={d.label}>
                        <p className="text-xs text-muted-foreground">{d.label}</p>
                        <p className="text-sm font-medium">{String(d.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {truck.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{truck.notes}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
