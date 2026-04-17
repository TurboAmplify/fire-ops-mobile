import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ClipboardCheck, FileSignature, Receipt, AlertTriangle, CheckCircle2 } from "lucide-react";

type TabKey = "inspections" | "signatures" | "expenses";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "inspections", label: "Inspections", icon: ClipboardCheck },
  { key: "signatures", label: "Signatures", icon: FileSignature },
  { key: "expenses", label: "Expenses", icon: Receipt },
];

export default function AdminLogs() {
  const { membership, isAdmin, loading } = useOrganization();
  const [tab, setTab] = useState<TabKey>("inspections");

  if (loading) {
    return (
      <AppShell title="Activity Logs">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;
  const orgId = membership?.organizationId;

  return (
    <AppShell title="Activity Logs">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all touch-target ${
                tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "inspections" && <InspectionsLog orgId={orgId} />}
        {tab === "signatures" && <SignaturesLog orgId={orgId} />}
        {tab === "expenses" && <ExpensesLog orgId={orgId} />}
      </div>
    </AppShell>
  );
}

function InspectionsLog({ orgId }: { orgId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-inspections", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("truck_inspections")
        .select("id, performed_at, performed_by_name, status, notes, truck_id, trucks(name)")
        .eq("organization_id", orgId!)
        .order("performed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty message="No inspections logged yet." />;

  return (
    <div className="rounded-xl bg-card divide-y divide-border overflow-hidden">
      {data.map((row: any) => (
        <div key={row.id} className="flex items-center gap-3 px-4 py-3">
          {row.status === "issues" ? (
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {row.trucks?.name ?? "Truck"} · {row.performed_by_name ?? "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(row.performed_at).toLocaleString([], {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            row.status === "issues" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
          }`}>
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function SignaturesLog({ orgId }: { orgId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-signatures", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_audit_log")
        .select("id, signed_at, signer_name, signer_type, method")
        .eq("organization_id", orgId!)
        .order("signed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty message="No signatures captured yet." />;

  return (
    <div className="rounded-xl bg-card divide-y divide-border overflow-hidden">
      {data.map((row: any) => (
        <div key={row.id} className="flex items-center gap-3 px-4 py-3">
          <FileSignature className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {row.signer_name ?? "Unknown"} <span className="text-muted-foreground font-normal">· {row.signer_type}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(row.signed_at).toLocaleString([], {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })} · {row.method}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpensesLog({ orgId }: { orgId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-expenses", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, date, amount, category, vendor, status, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty message="No expenses logged yet." />;

  return (
    <div className="rounded-xl bg-card divide-y divide-border overflow-hidden">
      {data.map((row: any) => (
        <div key={row.id} className="flex items-center gap-3 px-4 py-3">
          <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {row.vendor || row.category} · ${Number(row.amount).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(row.date).toLocaleDateString()} · {row.category}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            row.status === "approved" ? "bg-success/15 text-success" :
            row.status === "rejected" ? "bg-destructive/15 text-destructive" :
            "bg-muted text-muted-foreground"
          }`}>
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">{message}</div>;
}
