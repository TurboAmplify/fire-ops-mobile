import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { Plus, Loader2, Truck as TruckIcon, DollarSign } from "lucide-react";
import { useTrucks } from "@/hooks/useFleet";
import { TRUCK_STATUS_LABELS, type TruckStatus } from "@/services/fleet";
import { useState } from "react";
import { SignedImage } from "@/components/ui/SignedImage";
import { useOrganization } from "@/hooks/useOrganization";
import { useAppMode } from "@/lib/app-mode";

const filters: (TruckStatus | "all")[] = ["all", "available", "deployed", "maintenance"];

export default function Fleet() {
  const [filter, setFilter] = useState<TruckStatus | "all">("all");
  const { data: trucks, isLoading, error } = useTrucks();
  const { isAdmin } = useOrganization();
  const { modules } = useAppMode();
  const showRatesLink = isAdmin && modules.payroll;

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
        {showRatesLink && (
          <Link
            to="/fleet/rates"
            className="flex items-center gap-3 rounded-xl bg-primary/8 border border-primary/20 p-3 active:bg-primary/12 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Truck Rates</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Set the daily rate each truck earns on assignment
              </p>
            </div>
          </Link>
        )}

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
              const subtitle = [truck.unit_type, truck.make, truck.model].filter(Boolean).join(" · ");
              return (
                <Link
                  key={truck.id}
                  to={`/fleet/${truck.id}`}
                  className="flex items-stretch gap-3 rounded-2xl bg-card card-shadow p-2.5 transition-all duration-150 active:scale-[0.98] active:shadow-none"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-accent">
                    {photoUrl ? (
                      <SignedImage
                        src={photoUrl}
                        alt={truck.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <TruckIcon className="h-7 w-7 text-accent-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-[15px] leading-tight">{truck.name}</p>
                      <StatusBadge status={truck.status as TruckStatus} />
                    </div>
                    {subtitle && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
                    )}
                    {truck.plate && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                        Plate {truck.plate}
                        {truck.year ? ` · ${truck.year}` : ""}
                      </p>
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
