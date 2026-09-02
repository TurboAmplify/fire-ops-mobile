import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Download, RotateCcw, Shirt } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { downloadCsv } from "@/services/reports/exporters/csv";

type Payload = {
  shirt_size?: string | null;
  shirt_count?: number;
  pants_waist?: string;
  pants_length?: string | null;
  pants_count?: number;
  has_hardhat?: string | null;
  has_backpack?: string | null;
  mismatches?: { item: string | null; size: string; notes: string }[];
  notes?: string;
};

type Response = {
  id: string;
  crew_member_id: string;
  crew_member_name: string;
  payload: Payload;
  created_at: string;
};

export default function AdminGearSurvey() {
  const { membership } = useOrganization();
  const orgId = membership?.organizationId ?? null;
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const responses = useQuery({
    queryKey: ["gear_survey_responses", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gear_survey_responses" as never)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Response[];
    },
  });

  const remaining = useQuery({
    queryKey: ["gear_survey_remaining", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: crew, error } = await supabase
        .from("crew_members")
        .select("id, name")
        .eq("organization_id", orgId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      const { data: done, error: e2 } = await supabase
        .from("gear_survey_responses" as never)
        .select("crew_member_id")
        .eq("organization_id", orgId!);
      if (e2) throw e2;
      const doneIds = new Set(((done ?? []) as unknown as { crew_member_id: string }[]).map((r) => r.crew_member_id));
      return (crew ?? []).filter((c) => !doneIds.has(c.id));
    },
  });

  const settings = useQuery({
    queryKey: ["gear_survey_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gear_survey_settings" as never)
        .select("is_open")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as { is_open: boolean } | null)?.is_open ?? true;
    },
  });

  const isOpen = settings.data ?? true;

  const toggleOpen = async (open: boolean) => {
    if (!orgId) return;
    setToggling(true);
    const { error } = await supabase
      .from("gear_survey_settings" as never)
      .upsert({ organization_id: orgId, is_open: open } as never, { onConflict: "organization_id" });
    setToggling(false);
    if (error) toast.error("Couldn't update the setting");
    else {
      toast.success(open ? "Form link is open" : "Form link is closed");
      qc.invalidateQueries({ queryKey: ["gear_survey_settings", orgId] });
    }
  };

  const resetResponse = async (r: Response) => {
    const { error } = await supabase
      .from("gear_survey_responses" as never)
      .delete()
      .eq("id", r.id);
    if (error) toast.error("Couldn't reset this response");
    else {
      toast.success(`${r.crew_member_name} can submit again`);
      qc.invalidateQueries({ queryKey: ["gear_survey_responses", orgId] });
      qc.invalidateQueries({ queryKey: ["gear_survey_remaining", orgId] });
    }
  };

  const rows = useMemo(() => responses.data ?? [], [responses.data]);

  const exportCsv = () => {
    const headers = [
      "Name", "Submitted", "Shirt Size", "Shirt Count", "Pants Waist", "Pants Length",
      "Pants Count", "Hardhat", "Backpack", "Doesn't Fit", "Notes",
    ];
    const body = rows.map((r) => {
      const p = r.payload ?? {};
      return [
        r.crew_member_name,
        new Date(r.created_at).toLocaleString(),
        p.shirt_size ?? "",
        String(p.shirt_count ?? ""),
        p.pants_waist ?? "",
        p.pants_length ?? "",
        String(p.pants_count ?? ""),
        p.has_hardhat ?? "",
        p.has_backpack ?? "",
        (p.mismatches ?? [])
          .map((m) => `${m.item ?? "?"} (${m.size || "?"})${m.notes ? `: ${m.notes}` : ""}`)
          .join("; "),
        p.notes ?? "",
      ];
    });
    downloadCsv("gear-survey", headers, body);
  };

  return (
    <AppShell title="Gear Survey" backPath="/more">
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <Label className="text-sm font-semibold">Accepting responses</Label>
              <p className="text-[11px] text-muted-foreground">
                Turn off when collection is finished — the public link will show “closed”.
              </p>
            </div>
            <Switch checked={isOpen} disabled={toggling} onCheckedChange={toggleOpen} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Card><CardContent className="p-3">
            <p className="text-xl font-bold">{(responses.data?.length ?? 0) + (remaining.data?.length ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Requested</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-xl font-bold text-success">{responses.data?.length ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Completed</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-xl font-bold text-warning">{remaining.data?.length ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Remaining</p>
          </CardContent></Card>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download CSV
        </button>

        {responses.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            No responses yet. Text the crew the link: <span className="font-mono text-[12px]">app.fireopshq.com/gear-form</span>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const p = r.payload ?? {};
              const mm = (p.mismatches ?? []).filter((m) => m.item || m.size);
              return (
                <Card key={r.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Shirt className="h-4 w-4 text-primary" />
                        <p className="text-sm font-bold">{r.crew_member_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetResponse(r)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">Shirt {p.shirt_size ?? "?"} × {p.shirt_count ?? 0}</Badge>
                      <Badge variant="secondary">
                        Pants {p.pants_waist ?? "?"}{p.pants_length ? ` ${p.pants_length}` : ""} × {p.pants_count ?? 0}
                      </Badge>
                      <Badge variant={p.has_hardhat === "yes" ? "secondary" : "destructive"}>
                        Hardhat: {p.has_hardhat ?? "?"}
                      </Badge>
                      <Badge variant={p.has_backpack === "yes" ? "secondary" : "destructive"}>
                        Backpack: {p.has_backpack ?? "?"}
                      </Badge>
                    </div>
                    {mm.length > 0 && (
                      <p className="text-[12px] text-warning">
                        Doesn't fit: {mm.map((m) => `${m.item ?? "?"} (${m.size || "?"})${m.notes ? ` — ${m.notes}` : ""}`).join("; ")}
                      </p>
                    )}
                    {p.notes && <p className="text-[12px] text-muted-foreground">{p.notes}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      Submitted {new Date(r.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {(remaining.data?.length ?? 0) > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Haven't submitted
              </p>
              <div className="flex flex-wrap gap-1.5">
                {remaining.data!.map((c) => (
                  <Badge key={c.id} variant="outline">{c.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
