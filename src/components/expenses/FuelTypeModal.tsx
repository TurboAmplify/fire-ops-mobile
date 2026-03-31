import { FUEL_TYPE_LABELS } from "@/services/expenses";
import type { FuelType } from "@/services/expenses";
import { Fuel, Truck, Droplets, Disc, Flame, type LucideIcon } from "lucide-react";

const fuelTypes: FuelType[] = ["truck", "pump", "saw", "burn"];
const fuelIconMap: Record<FuelType, LucideIcon> = {
  truck: Truck,
  pump: Droplets,
  saw: Disc,
  burn: Flame,
};

interface Props {
  open: boolean;
  onConfirm: (fuelType: FuelType) => void;
  onSkip: () => void;
}

export function FuelTypeModal({ open, onConfirm, onSkip }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 space-y-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Fuel Purchase Detected</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          What type of equipment was this fuel for?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {fuelTypes.map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => onConfirm(ft)}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground transition-colors active:bg-primary active:text-primary-foreground touch-target"
            >
              <span className="text-lg">{fuelIcons[ft]}</span>
              {FUEL_TYPE_LABELS[ft]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-xl py-3 text-sm font-medium text-muted-foreground touch-target"
        >
          Skip — not fuel
        </button>
      </div>
    </div>
  );
}
