import { AppShell } from "@/components/AppShell";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { CATEGORY_LABELS } from "@/services/expenses";
import type { ExpenseCategory } from "@/services/expenses";
import { ArrowLeft, Loader2, CircleDollarSign, CheckCircle2, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

type Filter = "pending" | "paid" | "all";

interface ProfileLite {
  id: string;
  full_name: string | null;
  crew_member_id: string | null;
}

export default function AccountsPayable() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrganization();
  const { data: expenses, isLoading } = useExpenses();
  const { data: crewMembers } = useCrewMembers();
  const updateMutation = useUpdateExpense();
  const [filter, setFilter] = useState<Filter>("pending");
  const [actingId, setActingId] = useState<string | null>(null);

  // Resolve submitting users -> profile -> crew_member name for grouping
  const submitterUserIds = useMemo(() => {
    const ids = new Set<string>();
    (expenses ?? []).forEach((e) => {
      if (e.expense_type === "reimbursement" && e.submitted_by_user_id) {
        ids.add(e.submitted_by_user_id);
      }
    });
    return Array.from(ids);
  }, [expenses]);

  const { data: profiles } = useQuery({
    queryKey: ["ap-profiles", membership?.organizationId, submitterUserIds.sort().join(",")],
    queryFn: async () => {
      if (submitterUserIds.length === 0) return [] as ProfileLite[];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, crew_member_id")
        .in("id", submitterUserIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
    enabled: submitterUserIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Filter to reimbursement expenses only, scoped by status filter
  const reimbursements = useMemo(() => {
    return (expenses ?? []).filter((e) => {
      if (e.expense_type !== "reimbursement") return false;
      if (filter === "pending") return e.status === "approved";
      if (filter === "paid") return e.status === "reimbursed";
      return e.status === "approved" || e.status === "reimbursed";
    });
  }, [expenses, filter]);

  // Build groups: crewMemberId (or unmatched user) -> { name, items, total }
  const groups = useMemo(() => {
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const crewById = new Map((crewMembers ?? []).map((c: any) => [c.id, c]));

    const map = new Map<
      string,
      { key: string; name: string; crewMemberId: string | null; items: typeof reimbursements; total: number }
    >();

    reimbursements.forEach((e) => {
      const userId = e.submitted_by_user_id ?? null;
      const profile = userId ? profileById.get(userId) ?? null : null;
      const crewMemberId = profile?.crew_member_id ?? null;
      const crew = crewMemberId ? crewById.get(crewMemberId) : null;
      const key = crewMemberId ?? userId ?? "_unknown";
      const name =
        (crew as any)?.name ||
        profile?.full_name ||
        (userId ? "Unlinked submitter" : "Unknown");

      let g = map.get(key);
      if (!g) {
        g = { key, name, crewMemberId, items: [], total: 0 };
        map.set(key, g);
      }
      g.items.push(e);
      g.total += Number(e.amount) || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reimbursements, profiles, crewMembers]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const grandCount = reimbursements.length;

  const handleMarkPaid = async (id: string, viaPayrollPeriod?: string) => {
    setActingId(id);
    try {
      await updateMutation.mutateAsync({
        id,
        updates: {
          status: "reimbursed",
          reimbursed_at: new Date().toISOString(),
          paid_via_payroll_period: viaPayrollPeriod ?? null,
          reviewed_by_user_id: user?.id ?? null,
        },
      });
      toast.success(viaPayrollPeriod ? "Marked paid via payroll" : "Marked paid");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark paid");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AppShell title="">
      <div className="px-4 py-3 flex items-center gap-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button
          onClick={() => navigate("/more")}
          className="touch-target flex items-center text-muted-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate">Accounts Payable</h1>
          <p className="text-[11px] text-muted-foreground">Approved crew reimbursements owed</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Summary card */}
        <div className="rounded-2xl bg-card card-shadow p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <CircleDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {filter === "pending" ? "Owed to crew" : filter === "paid" ? "Paid" : "All reimbursements"}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              ${grandTotal.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {grandCount} {grandCount === 1 ? "expense" : "expenses"} · {groups.length} {groups.length === 1 ? "person" : "people"}
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: "pending" as Filter, label: "Pending" },
            { id: "paid" as Filter, label: "Paid" },
            { id: "all" as Filter, label: "All" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors touch-target ${
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Groups */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl bg-card card-shadow p-8 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">
              {filter === "pending"
                ? "No reimbursements owed"
                : filter === "paid"
                ? "No reimbursements paid yet"
                : "No reimbursement expenses"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {filter === "pending"
                ? "Approved crew reimbursements will appear here."
                : "Items marked paid will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <section key={g.key} className="rounded-2xl bg-card card-shadow overflow-hidden">
                <header className="px-4 py-3 flex items-center gap-3 border-b border-border/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.items.length} {g.items.length === 1 ? "expense" : "expenses"}
                      {!g.crewMemberId && (
                        <span className="ml-2 text-[hsl(var(--warning))]">· not linked to crew</span>
                      )}
                    </p>
                  </div>
                  <p className="text-base font-bold tabular-nums">${g.total.toFixed(2)}</p>
                </header>
                <ul className="divide-y divide-border/40">
                  {g.items.map((e) => {
                    const cat = (e.category as ExpenseCategory) ?? "other";
                    const isPaid = e.status === "reimbursed";
                    const isActing = actingId === e.id;
                    return (
                      <li key={e.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => navigate(`/expenses/${e.id}`)}
                            className="flex-1 min-w-0 text-left touch-target"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {e.vendor || CATEGORY_LABELS[cat] || "Expense"}
                              </span>
                              {isPaid && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">
                                  Paid
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {format(new Date(e.date), "MMM d, yyyy")} · {CATEGORY_LABELS[cat] || e.category}
                              {e.paid_via_payroll_period && (
                                <span className="ml-1">· payroll {e.paid_via_payroll_period}</span>
                              )}
                            </p>
                            {e.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {e.description}
                              </p>
                            )}
                          </button>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums">
                              ${Number(e.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {!isPaid && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleMarkPaid(e.id)}
                              disabled={isActing}
                              className="flex-1 touch-target text-xs font-semibold rounded-lg bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                              {isActing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Mark Paid
                            </button>
                            <button
                              onClick={() => {
                                const period = window.prompt(
                                  "Tag with payroll period (e.g. 2026-W17). Leave blank to cancel.",
                                  format(new Date(), "yyyy-'W'II"),
                                );
                                if (period && period.trim()) {
                                  handleMarkPaid(e.id, period.trim());
                                }
                              }}
                              disabled={isActing}
                              className="flex-1 touch-target text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground px-3 py-2 disabled:opacity-50"
                            >
                              Pay via Payroll
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
