import { STATUS_LABELS, STATUS_COLORS } from "@/services/expenses";
import type { ExpenseStatus } from "@/services/expenses";

export function ExpenseStatusBadge({ status }: { status: string }) {
  const s = status as ExpenseStatus;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[s] ?? "bg-muted text-muted-foreground"}`}>
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
