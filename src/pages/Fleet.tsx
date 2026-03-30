import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, Truck as TruckIcon } from "lucide-react";
import { useTrucks } from "@/hooks/useFleet";
import { TRUCK_STATUS_LABELS, type TruckStatus } from "@/services/fleet";
import { useState } from "react";

const filters: (TruckStatus | "all")[] = ["all", "available", "deployed", "maintenance"];

export default function Fleet() {
  const [filter, setFilter] = useState<TruckStatus | "all">("all");
  const { data: trucks, isLoading, error } = useTrucks();

  const filtered =
    trucks && filter === "all"
      ? trucks
      : trucks?.filter((t) => t.status === filter) ?? [];

  return (
    <AppShell
      title="Fleet"
      headerRight={
        <Link
          to="/fleet/new"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
        >
          <Plus className="h-4 w-4" />
          Add Truck
        </Link>
      }
    >
      <div className="p-4 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors touch-target ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f === "all" ? "All" : TRUCK_STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-12 text-center text-destructive">
            Failed to load trucks.
          </p>
        )}

        {!isLoading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                {filter === "all" ? "No trucks yet. Tap + to add one." : "No trucks match this filter."}
              </p>
            )}
            {filtered.map((truck) => (
              <Link
                key={truck.id}
                to={`/fleet/${truck.id}`}
                className="block rounded-xl bg-card p-4 transition-transform active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <TruckIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-semibold">{truck.name}</p>
                      {(truck.unit_type || truck.make) && (
                        <p className="text-sm text-muted-foreground">
                          {[truck.unit_type, truck.make, truck.model].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={truck.status as TruckStatus} />
                </div>
                {truck.notes && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-1">{truck.notes}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: TruckStatus }) {
  const colors: Record<TruckStatus, string> = {
    available: "bg-success/15 text-success",
    deployed: "bg-primary/15 text-primary",
    maintenance: "bg-warning/15 text-warning",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${colors[status]}`}>
      {TRUCK_STATUS_LABELS[status]}
    </span>
  );
}
