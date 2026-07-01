import { Card } from "@/components/ui/card";

interface KpiCardsProps {
  submitted: number;
  advanced: number;
  reserveHeld: number;
  released: number;
  count: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function FactoringKpiCards({ submitted, advanced, reserveHeld, released, count }: KpiCardsProps) {
  const items = [
    { label: "Total Submitted", value: fmt(submitted), sub: `${count} schedule${count === 1 ? "" : "s"}`, tone: "text-foreground" },
    { label: "Advanced", value: fmt(advanced), sub: "Paid on submission", tone: "text-primary" },
    { label: "Reserve Held", value: fmt(reserveHeld), sub: "Outstanding", tone: "text-amber-600 dark:text-amber-400" },
    { label: "Released", value: fmt(released), sub: "Reserve paid back", tone: "text-emerald-600 dark:text-emerald-400" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</p>
          <p className={`mt-1.5 text-xl font-bold tabular-nums lg:text-2xl ${it.tone}`}>{it.value}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{it.sub}</p>
        </Card>
      ))}
    </div>
  );
}
