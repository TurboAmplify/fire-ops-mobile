import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Check } from "lucide-react";
import {
  listIncidentFinanceContacts,
  contactDisplayName,
  contactDisplayEmail,
  type IncidentTruckFinanceContact,
} from "@/services/incident-truck-finance-contacts";
import { useCreateThread } from "@/hooks/useThreads";
import { sendReply, type ThreadPurpose } from "@/services/threads";
import { handleMutationError } from "@/lib/offline-guard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  listAssignedCrewWithRedCards,
  listOrgCrewWithRedCards,
  listIncidentTrucksForPicker,
  type CrewWithRedCard,
  type IncidentTruckForPicker,
} from "@/services/red-cards";
import { generateRedCardsPdfBlob } from "@/lib/pdf-red-cards";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incidentId: string;
  defaultSubject?: string;
}

const PURPOSES: { value: ThreadPurpose; label: string }[] = [
  { value: "general", label: "General" },
  { value: "shift_ticket", label: "Shift ticket" },
  { value: "demob", label: "Demob" },
  { value: "of286", label: "OF-286" },
  { value: "red_cards", label: "Red cards" },
];

type CrewScope = "assigned" | "all";

export function NewThreadSheet({ open, onOpenChange, incidentId, defaultSubject }: Props) {
  const [contacts, setContacts] = useState<IncidentTruckFinanceContact[]>([]);
  const [contactId, setContactId] = useState<string>("");
  const [purpose, setPurpose] = useState<ThreadPurpose>("general");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [incidentName, setIncidentName] = useState<string>("");
  const [incidentOrgId, setIncidentOrgId] = useState<string | null>(null);

  // Red card picker state
  const [scope, setScope] = useState<CrewScope>("assigned");
  const [crewLoading, setCrewLoading] = useState(false);
  const [assignedCrew, setAssignedCrew] = useState<CrewWithRedCard[]>([]);
  const [allCrew, setAllCrew] = useState<CrewWithRedCard[]>([]);
  const [trucks, setTrucks] = useState<IncidentTruckForPicker[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const create = useCreateThread();
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject ?? "");
    setBody("");
    setPurpose("general");
    setSelectedIds(new Set());
    setSearch("");
    setScope("assigned");
    setAssignedCrew([]);
    setAllCrew([]);
    setTrucks([]);
    setSelectedTruckId(null);
    listIncidentFinanceContacts(incidentId)
      .then((rows) => {
        setContacts(rows);
        if (rows[0]) setContactId(rows[0].id);
      })
      .catch(() => setContacts([]));
    supabase
      .from("incidents")
      .select("name, organization_id")
      .eq("id", incidentId)
      .maybeSingle()
      .then(({ data }) => {
        setIncidentName((data as any)?.name ?? "");
        setIncidentOrgId((data as any)?.organization_id ?? null);
      });
  }, [open, incidentId, defaultSubject]);

  // Load crew lists when red_cards purpose selected
  useEffect(() => {
    if (!open || purpose !== "red_cards") return;
    const orgId = incidentOrgId ?? contacts[0]?.organization_id;
    setCrewLoading(true);
    Promise.all([
      listAssignedCrewWithRedCards(incidentId).catch(() => []),
      orgId ? listOrgCrewWithRedCards(orgId).catch(() => []) : Promise.resolve([]),
      listIncidentTrucksForPicker(incidentId).catch(() => []),
    ])
      .then(([a, b, ts]) => {
        setAssignedCrew(a);
        setAllCrew(b);
        setTrucks(ts as IncidentTruckForPicker[]);
        if ((ts as IncidentTruckForPicker[]).length === 1) {
          setSelectedTruckId((ts as IncidentTruckForPicker[])[0].incident_truck_id);
        }
      })
      .finally(() => setCrewLoading(false));
    if (!subject.trim() || subject.startsWith("Red Cards") === false) {
      setSubject(`Red Cards — ${incidentName || "Incident"}`);
    }
    if (!body.trim()) {
      setBody(
        `Hello,\n\nAttached are the requested red cards for ${incidentName || "this incident"}.\n\nPlease let me know if you have any questions.\n\nThanks,`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purpose, incidentId, contacts, incidentName, incidentOrgId]);

  const assignedCrewForTruck = useMemo(
    () => (selectedTruckId ? assignedCrew.filter((c) => c.incident_truck_id === selectedTruckId) : []),
    [assignedCrew, selectedTruckId],
  );

  const visibleCrew = useMemo(() => {
    const src = scope === "assigned" ? assignedCrewForTruck : allCrew;
    const q = search.trim().toLowerCase();
    const filtered = q
      ? src.filter((c) => c.name.toLowerCase().includes(q) || (c.position ?? "").toLowerCase().includes(q))
      : src;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [scope, assignedCrewForTruck, allCrew, search]);

  // Clear selections when switching the resource (truck), to avoid stale picks.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedTruckId, scope]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!contactId || !subject.trim() || !body.trim()) {
      toast.error("Pick a contact, subject, and message");
      return;
    }
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    if (purpose === "red_cards" && selectedIds.size === 0) {
      toast.error("Pick at least one red card to attach");
      return;
    }

    setLoading(true);
    try {
      let attachments: string[] = [];
      let finalBody = body.trim();

      if (purpose === "red_cards") {
        const pool = [...assignedCrew, ...allCrew];
        const picked: CrewWithRedCard[] = [];
        const seen = new Set<string>();
        for (const c of pool) {
          if (selectedIds.has(c.crew_member_id) && !seen.has(c.crew_member_id) && c.card) {
            picked.push(c);
            seen.add(c.crew_member_id);
          }
        }
        const { blob, fileName } = await generateRedCardsPdfBlob(
          picked.map((p) => ({ card: p.card!, memberName: p.name })),
          incidentName,
        );
        const orgId = contact.organization_id;
        const path = `${orgId}/red-cards/${incidentId}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("communication-attachments")
          .upload(path, blob, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        attachments = [path];
        void fileName;

        // Append truck + crew summary so the recipient knows who/what is attached.
        const byTruck = new Map<string, string[]>();
        const noTruck: string[] = [];
        for (const p of picked) {
          const line = p.position ? `${p.name} (${p.position})` : p.name;
          if (p.truck_name) {
            const arr = byTruck.get(p.truck_name) ?? [];
            arr.push(line);
            byTruck.set(p.truck_name, arr);
          } else {
            noTruck.push(line);
          }
        }
        const summaryLines: string[] = [`Attached: ${picked.length} red card${picked.length === 1 ? "" : "s"}.`];
        const truckNames = Array.from(byTruck.keys()).sort();
        for (const t of truckNames) {
          const members = byTruck.get(t)!;
          summaryLines.push("", `${t} (${members.length}):`);
          for (const m of members) summaryLines.push(`  • ${m}`);
        }
        if (noTruck.length) {
          summaryLines.push("", `Unassigned (${noTruck.length}):`);
          for (const m of noTruck) summaryLines.push(`  • ${m}`);
        }
        finalBody = `${finalBody}\n\n---\n${summaryLines.join("\n")}`;
      }

      const thread = await create.mutateAsync({
        incidentId,
        contactId: contact.id,
        financeOfficerId: contact.finance_officer_id ?? null,
        purpose,
        subject: subject.trim(),
      });
      await sendReply(thread.id, finalBody, attachments);
      toast.success(purpose === "red_cards" ? "Red cards sent" : "Thread started");
      onOpenChange(false);
      nav(`/messages/${thread.id}`);
    } catch (e) {
      handleMutationError(e, "Could not start thread");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New message</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4 pb-8">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">To</label>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No finance contacts on this incident yet. Add one from the Overview tab first.
              </p>
            ) : (
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {contacts.map((c) => {
                  const email = contactDisplayEmail(c);
                  return (
                    <option key={c.id} value={c.id}>
                      {contactDisplayName(c)}{email ? ` · ${email}` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as ThreadPurpose)}
              className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {purpose === "red_cards" && (
            <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Red cards to attach
                </label>
                <span className="text-[11px] text-muted-foreground">{selectedIds.size} selected</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setScope("assigned")}
                  className={`rounded-md px-2 py-2 text-xs min-h-[40px] ${
                    scope === "assigned" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  Assigned to truck ({scope === "assigned" ? assignedCrewForTruck.length : (trucks.find(t => t.incident_truck_id === selectedTruckId)?.crew_count ?? 0)})
                </button>
                <button
                  onClick={() => setScope("all")}
                  className={`rounded-md px-2 py-2 text-xs min-h-[40px] ${
                    scope === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  All crew ({allCrew.length})
                </button>
              </div>

              {scope === "assigned" && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Resource
                  </label>
                  {trucks.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">No trucks on this incident yet.</p>
                  ) : trucks.length === 1 ? (
                    <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
                      {trucks[0].truck_name} · {trucks[0].crew_count} crew
                    </div>
                  ) : (
                    <select
                      value={selectedTruckId ?? ""}
                      onChange={(e) => setSelectedTruckId(e.target.value || null)}
                      className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Pick a truck…</option>
                      {trucks.map((t) => (
                        <option key={t.incident_truck_id} value={t.incident_truck_id}>
                          {t.truck_name} · {t.crew_count} crew
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search crew"
                  className="pl-7 h-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                {crewLoading ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Loading…
                  </div>
                ) : visibleCrew.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {scope === "assigned"
                      ? selectedTruckId
                        ? "No crew assigned to this truck yet."
                        : "Pick a resource above to see its crew."
                      : "No crew in your organization yet."}
                  </p>
                ) : (
                  visibleCrew.map((c) => {
                    const checked = selectedIds.has(c.crew_member_id);
                    const hasCard = !!c.card;
                    return (
                      <button
                        key={c.crew_member_id}
                        onClick={() => hasCard && toggle(c.crew_member_id)}
                        disabled={!hasCard}
                        className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-b-0 ${
                          hasCard ? "hover:bg-accent/40" : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {[c.position, c.truck_name].filter(Boolean).join(" · ")}
                            {!hasCard && (c.position || c.truck_name ? " · " : "") + "No card on file"}
                          </p>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                One combined PDF (front + back for each selected card) will be attached.
              </p>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Subject" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="mt-1" placeholder="Write your message…" />
          </div>
          <button
            onClick={handleSend}
            disabled={
              loading ||
              contacts.length === 0 ||
              (purpose === "red_cards" && selectedIds.size === 0)
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground touch-target flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {purpose === "red_cards" ? `Send ${selectedIds.size || ""} red card${selectedIds.size === 1 ? "" : "s"}`.trim() : "Send"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
