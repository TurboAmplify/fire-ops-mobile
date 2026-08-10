import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Download, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { downloadCsv } from "@/services/reports/exporters/csv";
import { shareOrDownload, safeFilename } from "@/services/reports/exporters/share";
import {
  ALL_COURSE_KEYS,
  COURSE_LABELS,
  IBPA_COMPANY,
  IBPA_EXCLUDED,
  type CourseAnswer,
  type IbpaResponse,
} from "@/lib/ibpa";

const PUBLIC_PATH = "/training-form";

function courseOf(r: IbpaResponse, key: string): CourseAnswer {
  const c = r.courses?.[key];
  if (c && typeof c === "object") return c as CourseAnswer;
  return { date: null, unknown: false };
}

function courseText(r: IbpaResponse, key: string) {
  const c = courseOf(r, key);
  if (c.unknown) return "UNKNOWN";
  if (!c.date) return "MISSING";
  let s = c.date;
  if (c.online === "yes") {
    const prov = c.provider === "Another provider" ? c.provider_other : c.provider;
    s += ` (online — ${prov || "provider not given"})`;
  }
  return s;
}

export default function AdminIbpaTraining() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  const qc = useQueryClient();
  const [resetting, setResetting] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ibpa_training", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [crewRes, respRes, setRes] = await Promise.all([
        supabase
          .from("crew_members")
          .select("id, name, role")
          .eq("organization_id", orgId!)
          .eq("active", true)
          .order("name"),
        supabase
          .from("ibpa_training_responses")
          .select("*")
          .eq("organization_id", orgId!)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("ibpa_collection_settings")
          .select("is_open")
          .eq("organization_id", orgId!)
          .maybeSingle(),
      ]);
      if (crewRes.error) throw crewRes.error;
      if (respRes.error) throw respRes.error;
      const excluded = IBPA_EXCLUDED.map((n) => n.toLowerCase());
      return {
        crew: (crewRes.data ?? []).filter((c) => !excluded.includes(c.name.trim().toLowerCase())),
        responses: (respRes.data ?? []) as unknown as IbpaResponse[],
        isOpen: setRes.data?.is_open ?? true,
      };
    },
  });

  const crew = data?.crew ?? [];
  const responses = useMemo(() => data?.responses ?? [], [data]);
  const doneIds = new Set(responses.map((r) => r.crew_member_id));
  const remaining = crew.filter((c) => !doneIds.has(c.id));

  async function toggleOpen(open: boolean) {
    if (!orgId) return;
    const { error } = await supabase
      .from("ibpa_collection_settings")
      .upsert({ organization_id: orgId, is_open: open }, { onConflict: "organization_id" });
    if (error) return toast.error("Could not update the link setting.");
    toast.success(open ? "Public link enabled" : "Public link disabled");
    qc.invalidateQueries({ queryKey: ["ibpa_training"] });
  }

  async function resetResponse(id: string, name: string) {
    setResetting(id);
    const { error } = await supabase.from("ibpa_training_responses").delete().eq("id", id);
    setResetting(null);
    if (error) return toast.error("Could not reset that response.");
    toast.success(`${name} can complete the form again`);
    qc.invalidateQueries({ queryKey: ["ibpa_training"] });
  }

  function exportCsv() {
    const headers = [
      "Crew Member", "Submitted At", "Legal First", "Legal Middle", "No Middle Name", "Legal Last",
      "Email", "Phone", "Prior IBPA Form", "Verification ID", "Verification ID Unknown",
      "Legal Name Confirmed", "Recorded Role", "Role Confirmed?", "Corrected Qualifications",
      "Needs Review", "Agreement Categories", "WCT Arduous?",
      ...ALL_COURSE_KEYS.map((k) => COURSE_LABELS[k]),
      "Fields Marked Unknown",
    ];
    const rows = responses.map((r) => {
      const i = r.identity as Record<string, unknown>;
      return [
        r.crew_member_name,
        new Date(r.submitted_at).toLocaleString(),
        String(i.first_name ?? ""),
        String(i.middle_name ?? ""),
        i.no_middle_name ? "Yes" : "No",
        String(i.last_name ?? ""),
        String(i.email ?? ""),
        String(i.phone ?? ""),
        String(i.prior_ibpa ?? ""),
        String(i.verification_id ?? ""),
        i.verification_id_unknown ? "Yes" : "No",
        i.legal_name_confirmed ? "Yes" : "No",
        r.recorded_role ?? "",
        r.role_confirmation?.answer ?? "",
        (r.role_confirmation?.corrected ?? []).join("; "),
        r.needs_review ? "YES" : "",
        (r.agreement_categories ?? []).join("; "),
        String((r.courses as Record<string, unknown>)?.wct_arduous ?? ""),
        ...ALL_COURSE_KEYS.map((k) => courseText(r, k)),
        (r.unknown_fields ?? []).join("; "),
      ];
    });
    downloadCsv("ibpa-training-collection", headers, rows);
  }

  function buildText() {
    const lines: string[] = [];
    lines.push("USDA/IBPA TRAINING VERIFICATION — DATA COLLECTION EXPORT");
    lines.push("");
    lines.push("COMPANY-LEVEL INFORMATION");
    lines.push(`Vendor/provider: ${IBPA_COMPANY.vendor}`);
    lines.push(`MOU status: ${IBPA_COMPANY.mou}`);
    lines.push(`Company owner and lead instructor: ${IBPA_COMPANY.instructor}`);
    lines.push(`Provider/instructor phone: ${IBPA_COMPANY.phone}`);
    lines.push("");

    const missingAll: string[] = [];

    for (const r of responses) {
      const i = r.identity as Record<string, unknown>;
      lines.push("=".repeat(60));
      lines.push(`EMPLOYEE: ${r.crew_member_name}`);
      lines.push(`Submitted: ${new Date(r.submitted_at).toLocaleString()}`);
      lines.push(
        `Legal name: ${[i.first_name, i.no_middle_name ? "" : i.middle_name, i.last_name]
          .filter(Boolean)
          .join(" ")}`,
      );
      lines.push(`Email: ${i.email || "MISSING"}`);
      lines.push(`Phone: ${i.phone || "MISSING"}`);
      lines.push(`Previously submitted IBPA form: ${i.prior_ibpa ?? "MISSING"}`);
      lines.push(
        `IBPA Verification ID: ${i.verification_id_unknown ? "UNKNOWN (employee could not find)" : i.verification_id || "MISSING"}`,
      );
      lines.push(`Recorded role/qualifications: ${r.recorded_role ?? "MISSING"}`);
      lines.push(
        `Employee-confirmed qualifications: ${
          r.role_confirmation?.answer === "yes"
            ? "Confirmed as recorded"
            : (r.role_confirmation?.corrected ?? []).join(", ") || "MISSING"
        }`,
      );
      if (r.needs_review) lines.push("** ROLE DISCREPANCY — NEEDS ADMIN REVIEW **");
      lines.push(`Agreement categories: ${(r.agreement_categories ?? []).join(", ") || "MISSING"}`);
      lines.push(`Arduous WCT confirmed: ${String((r.courses as Record<string, unknown>)?.wct_arduous ?? "MISSING")}`);
      lines.push("Course dates:");
      for (const k of ALL_COURSE_KEYS) {
        const c = courseOf(r, k);
        if (!c.date && !c.unknown) continue;
        lines.push(`  - ${COURSE_LABELS[k]}: ${courseText(r, k)}`);
      }
      lines.push(
        `Provider/instructor for Dry Lightning-delivered courses: ${IBPA_COMPANY.vendor} / ${IBPA_COMPANY.instructor} / ${IBPA_COMPANY.phone}`,
      );
      const unknowns = r.unknown_fields ?? [];
      lines.push(`Unknown or missing: ${unknowns.join(", ") || "None reported"}`);
      if (unknowns.length) missingAll.push(`${r.crew_member_name}: ${unknowns.join(", ")}`);
      lines.push("");
    }

    lines.push("=".repeat(60));
    lines.push("MISSING INFORMATION (CONSOLIDATED)");
    if (remaining.length) {
      lines.push(`No response submitted yet: ${remaining.map((c) => c.name).join(", ")}`);
    }
    if (missingAll.length) {
      for (const m of missingAll) lines.push(`- ${m}`);
    }
    if (!remaining.length && !missingAll.length) lines.push("None.");
    lines.push("");
    lines.push(`Excluded from this collection: ${IBPA_EXCLUDED.join(", ")}`);
    return lines.join("\n");
  }

  function exportText() {
    shareOrDownload(safeFilename("ibpa-training-export", "txt"), buildText(), "text/plain;charset=utf-8");
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(buildText());
      toast.success("Export copied to clipboard");
    } catch {
      toast.error("Could not copy — use Download instead.");
    }
  }

  const publicUrl = `${window.location.origin}${PUBLIC_PATH}`;

  return (
    <AppShell title="IBPA Training Collection">
      <div className="space-y-4 p-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Requested" value={crew.length} />
              <Stat label="Completed" value={responses.length} />
              <Stat label="Remaining" value={remaining.length} />
            </div>

            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">Public link enabled</Label>
                  <Switch checked={!!data?.isOpen} onCheckedChange={toggleOpen} />
                </div>
                <button
                  className="w-full break-all rounded-md bg-muted p-3 text-left text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl).then(
                      () => toast.success("Link copied"),
                      () => toast.error("Copy failed"),
                    );
                  }}
                >
                  {publicUrl}
                </button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="h-11" onClick={exportCsv} disabled={!responses.length}>
                <Download className="mr-1 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" className="h-11" onClick={exportText} disabled={!responses.length}>
                <Download className="mr-1 h-4 w-4" /> Text
              </Button>
              <Button variant="outline" className="h-11" onClick={copyText} disabled={!responses.length}>
                <Copy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>

            <section className="space-y-2">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Completed ({responses.length})
              </h2>
              {responses.length === 0 && (
                <p className="px-1 text-sm text-muted-foreground">No submissions yet.</p>
              )}
              <Accordion type="single" collapsible className="rounded-2xl bg-card card-shadow">
                {responses.map((r) => (
                  <AccordionItem key={r.id} value={r.id} className="px-4">
                    <AccordionTrigger className="text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.crew_member_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(r.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      {r.needs_review && <Badge variant="destructive" className="mr-2">Review</Badge>}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pb-4 text-sm">
                      <Detail label="Recorded role" value={r.recorded_role ?? "—"} />
                      <Detail
                        label="Employee confirmed"
                        value={
                          r.role_confirmation?.answer === "yes"
                            ? "Correct as recorded"
                            : `${r.role_confirmation?.answer ?? "—"} · ${(r.role_confirmation?.corrected ?? []).join(", ")}`
                        }
                      />
                      <Detail label="Email" value={String((r.identity as Record<string, unknown>).email ?? "—")} />
                      <Detail label="Phone" value={String((r.identity as Record<string, unknown>).phone ?? "—")} />
                      <Detail label="Agreements" value={(r.agreement_categories ?? []).join(", ") || "—"} />
                      {ALL_COURSE_KEYS.map((k) => {
                        const c = courseOf(r, k);
                        if (!c.date && !c.unknown) return null;
                        return <Detail key={k} label={COURSE_LABELS[k]} value={courseText(r, k)} />;
                      })}
                      {(r.unknown_fields ?? []).length > 0 && (
                        <div className="rounded-md bg-muted p-3 text-xs">
                          <p className="font-semibold">Marked unknown</p>
                          <p className="text-muted-foreground">{r.unknown_fields.join(", ")}</p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="h-11 w-full"
                        disabled={resetting === r.id}
                        onClick={() => resetResponse(r.id, r.crew_member_name)}
                      >
                        {resetting === r.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Reset response
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <section className="space-y-2">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Remaining ({remaining.length})
              </h2>
              <div className="divide-y divide-border/60 rounded-2xl bg-card card-shadow">
                {remaining.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.role}</span>
                  </div>
                ))}
                {remaining.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Everyone has submitted.</p>
                )}
              </div>
            </section>

            <p className="px-1 text-[11px] text-muted-foreground">
              Excluded from this collection: {IBPA_EXCLUDED.join(", ")}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center card-shadow">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
