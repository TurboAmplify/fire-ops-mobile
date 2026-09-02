import { FINANCIAL_COLORS, FINANCIAL_SHORT, type FinancialStatus } from "@/services/incident-financial";

/** Compact owner-only factoring/payment tag. Render only for finance users. */
export function IncidentFinancialBadge({
  status,
  className = "",
}: {
  status: FinancialStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${FINANCIAL_COLORS[status]} ${className}`}
    >
      {FINANCIAL_SHORT[status]}
    </span>
  );
}
