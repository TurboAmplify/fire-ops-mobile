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
          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 h-9 text-sm font-semibold text-primary-foreground active:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Truck
        </Link>
      }
    >
      <div className="p-4 space-y-3">
        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                filter === f
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground active:bg-secondary/70"
              }`}
            >
              {f === "all" ? "All" : TRUCK_STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-16 text-center text-destructive text-sm">
            Failed to load trucks.
          </p>
        )}

        {!isLoading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <TruckIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {filter === "all" ? "No trucks yet" : "No trucks match this filter"}
                </p>
                {filter === "all" && (
                  <Link to="/fleet/new" className="text-xs font-semibold text-primary mt-1 inline-block">
                    Add your first truck
                  </Link>
                )}
              </div>
            )}
            {filtered.map((truck) => {
              const photoUrl = (truck as any).photo_url;
              return (
                <Link
                  key={truck.id}
                  to={`/fleet/${truck.id}`}
                  className="block rounded-2xl bg-card card-shadow transition-all duration-150 active:scale-[0.98] active:shadow-none overflow-hidden"
                >
                  {photoUrl ? (
                    <div className="aspect-[16/7] w-full overflow-hidden">
                      <SignedImage
                        src={photoUrl}
                        alt={truck.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {!photoUrl && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shrink-0">
                            <TruckIcon className="h-5 w-5 text-accent-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[15px]">{truck.name}</p>
                          {(truck.unit_type || truck.make) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[truck.unit_type, truck.make, truck.model].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={truck.status as TruckStatus} />
                    </div>
                    {truck.notes && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{truck.notes}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: TruckStatus }) {
  const colors: Record<TruckStatus, string> = {
    available: "bg-success/12 text-success",
    deployed: "bg-primary/12 text-primary",
    maintenance: "bg-warning/12 text-warning",
    needs_attention: "bg-destructive/12 text-destructive",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shrink-0 ${colors[status]}`}>
      {TRUCK_STATUS_LABELS[status]}
    </span>
  );
}
