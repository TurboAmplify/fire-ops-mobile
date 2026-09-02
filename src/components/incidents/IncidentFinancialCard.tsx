import { useState } from "react";
import { Landmark, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useFinanceAccess,
  useIncidentFinancialEvents,
  useIncidentFinancialStatus,
  useSetIncidentFinancialStatus,
} from "@/hooks/useIncidentFinancial";
import {
  FINANCIAL_LABELS,
  FINANCIAL_COLORS,
  type FinancialStatus,
} from "@/services/incident-financial";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const OPTIONS: { value: FinancialStatus; help: string }[] = [
  { value: "not_factored", help: "Nothing submitted to the factor for this incident." },
  { value: "factored", help: "Submitted to the factor — receivable still outstanding." },
  {
    value: "paid",
    help: "The debtor/state paid the factor, any final reserve was received, and nothing is left outstanding.",
  },
];

/** Owner-finance only. Shows and edits the factoring/payment status of an incident. */
export function IncidentFinancialCard({ incidentId }: { incidentId: string }) {
  const { hasFinanceAccess } = useFinanceAccess();
  const { data: row, isLoading } = useIncidentFinancialStatus(incidentId);
  const { data: events } = useIncidentFinancialEvents(incidentId);
  const setStatus = useSetIncidentFinancialStatus();

  const [pending, setPending] = useState<FinancialStatus | null>(null);
  const [note, setNote] = useState("");
  const [force, setForce] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (!hasFinanceAccess) return null;

  const current: FinancialStatus = row?.status ?? "not_factored";

  const confirm = async () => {
    if (!pending) return;
    try {
      await setStatus.mutateAsync({
        incidentId,
        status: pending,
        notes: note.trim() || null,
        source: "manual",
        force,
      });
      setPending(null);
      setNote("");
      setForce(false);
    } catch {
      /* toast handled in hook — keep the dialog open so it can be forced */
      if (pending === "paid") setForce(true);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-4 card-shadow">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="h-4 w-4 text-primary shrink-0" />
          <p className="font-semibold text-[15px] truncate">Factoring Status</p>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${FINANCIAL_COLORS[current]}`}
          >
            {FINANCIAL_LABELS[current]}
          </span>
        )}
      </div>

      <p className="mt-1 text-[11px] text-muted-foreground">Visible to finance-authorized users only.</p>

      {row && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
          {row.factored_at && (
            <>
              <dt className="text-muted-foreground">Factored</dt>
              <dd className="text-right font-medium">{fmtDate(row.factored_at)}</dd>
            </>
          )}
          {row.last_schedule_number != null && (
            <>
              <dt className="text-muted-foreground">Schedule #</dt>
              <dd className="text-right font-medium">{row.last_schedule_number}</dd>
            </>
          )}
          {row.factor_name && (
            <>
              <dt className="text-muted-foreground">Factor</dt>
              <dd className="text-right font-medium truncate">{row.factor_name}</dd>
            </>
          )}
          {row.amount_submitted != null && Number(row.amount_submitted) > 0 && (
            <>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="text-right font-medium tabular-nums">{money(Number(row.amount_submitted))}</dd>
            </>
          )}
          {row.invoice_numbers?.length > 0 && (
            <>
              <dt className="text-muted-foreground">Invoices</dt>
              <dd className="text-right font-medium truncate">{row.invoice_numbers.join(", ")}</dd>
            </>
          )}
          {row.paid_at && (
            <>
              <dt className="text-muted-foreground">Paid / complete</dt>
              <dd className="text-right font-medium">{fmtDate(row.paid_at)}</dd>
            </>
          )}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.filter((o) => o.value !== current).map((o) => (
          <Button
            key={o.value}
            size="sm"
            variant={o.value === "paid" ? "default" : "outline"}
            className="h-11 flex-1 min-w-[9rem]"
            onClick={() => {
              setPending(o.value);
              setForce(false);
              setNote("");
            }}
          >
            {o.value === "paid" ? "Mark Paid / Complete" : `Mark ${FINANCIAL_LABELS[o.value]}`}
          </Button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowHistory((s) => !s)}
        className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground"
      >
        <History className="h-3.5 w-3.5" />
        {showHistory ? "Hide history" : `History${events?.length ? ` (${events.length})` : ""}`}
      </button>

      {showHistory && (
        <div className="mt-2 space-y-1.5">
          {(events ?? []).length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No changes recorded yet.</p>
          ) : (
            events!.map((e) => (
              <div key={e.id} className="rounded-lg bg-secondary/60 px-3 py-2 text-[12px]">
                <p className="font-medium">
                  {e.from_status ? `${FINANCIAL_LABELS[e.from_status]} → ` : ""}
                  {FINANCIAL_LABELS[e.to_status]}
                </p>
                <p className="text-muted-foreground">
                  {fmtDate(e.created_at)} · {e.source.replace(/_/g, " ")}
                  {e.schedule_number != null ? ` · Schedule #${e.schedule_number}` : ""}
                  {e.amount != null ? ` · ${money(Number(e.amount))}` : ""}
                </p>
                {e.notes && <p className="mt-0.5 text-muted-foreground">{e.notes}</p>}
              </div>
            ))
          )}
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === "paid" ? "Mark Paid / Complete?" : `Change financial status?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? OPTIONS.find((o) => o.value === pending)!.help : ""}
              {force && pending === "paid" && (
                <span className="mt-2 block font-medium text-destructive">
                  Some factored schedules on this incident still have reserve outstanding. Confirming
                  again will close it anyway and record that it was forced.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional note (e.g. reserve received 9/2, check #1042)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[72px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              disabled={setStatus.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
            >
              {setStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {force ? "Close anyway" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
