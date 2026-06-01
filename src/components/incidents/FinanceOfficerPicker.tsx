import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, BadgeCheck, Plus, Mail, Phone, MapPin, ChevronRight, Pencil, ArrowUpDown } from "lucide-react";
import {
  listFinanceOfficers,
  listRegions,
  createFinanceOfficer,
  updateFinanceOfficer,
  recordOfficerUse,
  type FinanceOfficer,
  type GaccRegion,
} from "@/services/finance-officers";
import { addTruckFinanceContact, addIncidentFinanceContact } from "@/services/incident-truck-finance-contacts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Attach contact to a single truck. Mutually exclusive with incidentId. */
  incidentTruckId?: string;
  /** Attach contact to the incident as a whole. Mutually exclusive with incidentTruckId. */
  incidentId?: string;
  organizationId: string;
  defaultRegionId?: string | null;
  defaultRole?: "shift_tickets" | "demob" | "both";
  onAdded?: () => void;
}

export function FinanceOfficerPicker({
  open,
  onOpenChange,
  incidentTruckId,
  incidentId,
  organizationId,
  defaultRegionId,
  defaultRole = "both",
  onAdded,
}: Props) {
  const addContact = (extra: Omit<Parameters<typeof addIncidentFinanceContact>[0], "incident_id" | "organization_id">) => {
    if (incidentId) {
      return addIncidentFinanceContact({ incident_id: incidentId, organization_id: organizationId, ...extra });
    }
    if (incidentTruckId) {
      return addTruckFinanceContact({ incident_truck_id: incidentTruckId, organization_id: organizationId, ...extra });
    }
    throw new Error("FinanceOfficerPicker requires incidentId or incidentTruckId");
  };
  const [tab, setTab] = useState<"directory" | "new" | "oneoff">("directory");
  const [regions, setRegions] = useState<GaccRegion[]>([]);
  const [regionId, setRegionId] = useState<string | null>(defaultRegionId || null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "recent" | "used">("name");
  const [officers, setOfficers] = useState<FinanceOfficer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinanceOfficer | null>(null);

  // New officer form
  const [form, setForm] = useState({
    name: "",
    email: "",
    work_phone: "",
    cell_phone: "",
    dispatch_office: "",
    region_id: defaultRegionId ?? "",
    agency: "",
    notes: "",
  });

  // One-off contact form
  const [oneOff, setOneOff] = useState({ name: "", email: "", work_phone: "", cell_phone: "" });

  useEffect(() => {
    if (!open) return;
    listRegions().then(setRegions).catch(() => {});
    setRegionId(defaultRegionId || null);
  }, [open, defaultRegionId]);

  useEffect(() => {
    if (!open || tab !== "directory") return;
    setLoading(true);
    listFinanceOfficers({
      regionId: regionId || null,
      search,
    })
      .then(setOfficers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, tab, regionId, search]);

  const handlePick = async (o: FinanceOfficer) => {
    setSaving(true);
    setPickingId(o.id);
    try {
      await addContact({ finance_officer_id: o.id, role: defaultRole });
      recordOfficerUse(o.id).catch(() => {});
      toast.success(`${o.name} added as finance contact`);
      onAdded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setSaving(false);
      setPickingId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email required");
      return;
    }
    setSaving(true);
    try {
      const officer = await createFinanceOfficer({
        ...form,
        region_id: form.region_id || null,
        org_id: organizationId,
      });
      await addContact({ finance_officer_id: officer.id, role: defaultRole });
      toast.success(`${officer.name} added to directory and contact list`);
      onAdded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create officer");
    } finally {
      setSaving(false);
    }
  };

  const handleOneOff = async () => {
    if (!oneOff.email.trim()) {
      toast.error("Email required");
      return;
    }
    setSaving(true);
    try {
      await addContact({
        name_override: oneOff.name || undefined,
        email_override: oneOff.email,
        work_phone_override: oneOff.work_phone || undefined,
        cell_phone_override: oneOff.cell_phone || undefined,
        role: defaultRole,
      });
      toast.success("One-off contact added");
      onAdded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const regionOptions = useMemo(() => regions, [regions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Add finance contact</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-4 pb-4">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="new">New officer</TabsTrigger>
            <TabsTrigger value="oneoff">One-off</TabsTrigger>
          </TabsList>

          {/* DIRECTORY */}
          <TabsContent value="directory" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or dispatch office"
                className="pl-9 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={regionId ?? "all"} onValueChange={(v) => setRegionId(v === "all" ? null : v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regionOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.id} — {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {defaultRegionId && regionId === defaultRegionId && (
              <p className="text-xs text-muted-foreground">
                Showing officers in incident region <strong>{defaultRegionId}</strong>.
              </p>
            )}

            <div className="space-y-2 max-h-[55vh] overflow-y-auto -mx-1 px-1">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : officers.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    No officers match your search.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setTab("new")}>
                    <Plus className="h-4 w-4 mr-1" /> Add new officer
                  </Button>
                </div>
              ) : (
                officers.map((o) => {
                  const phone = o.cell_phone || o.work_phone || o.phone;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handlePick(o)}
                      disabled={saving}
                      className="w-full text-left p-3 border rounded-lg bg-card hover:bg-accent active:bg-accent transition-colors disabled:opacity-50 flex items-center gap-3 min-h-[64px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{o.name}</span>
                          {o.verified_at && <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{o.email}</span>
                        </div>
                        {phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{phone}</span>
                          </div>
                        )}
                        {(o.dispatch_office || o.region_id || o.agency) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                            {o.region_id && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{o.region_id}</Badge>}
                            {o.dispatch_office && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{o.dispatch_office}</span>
                              </span>
                            )}
                            {o.agency && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{o.agency}</Badge>}
                          </div>
                        )}
                      </div>
                      {pickingId === o.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* NEW OFFICER */}
          <TabsContent value="new" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Adds to the shared directory — visible to all crews.
            </p>
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Work phone"><Input type="tel" inputMode="tel" value={form.work_phone} onChange={(e) => setForm({ ...form, work_phone: e.target.value })} /></Field>
              <Field label="Cell phone"><Input type="tel" inputMode="tel" value={form.cell_phone} onChange={(e) => setForm({ ...form, cell_phone: e.target.value })} /></Field>
            </div>
            <Field label="Dispatch office"><Input value={form.dispatch_office} onChange={(e) => setForm({ ...form, dispatch_office: e.target.value })} /></Field>
            <Field label="Region">
              <Select value={form.region_id} onValueChange={(v) => setForm({ ...form, region_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick region" /></SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.id} — {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Agency"><Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="USFS, BLM, etc." /></Field>
            <Button onClick={handleCreateNew} disabled={saving} className="w-full h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Save and add</>}
            </Button>
          </TabsContent>

          {/* ONE-OFF */}
          <TabsContent value="oneoff" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Use only for one-time contacts (not saved to directory).
            </p>
            <Field label="Name"><Input value={oneOff.name} onChange={(e) => setOneOff({ ...oneOff, name: e.target.value })} /></Field>
            <Field label="Email *"><Input type="email" value={oneOff.email} onChange={(e) => setOneOff({ ...oneOff, email: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Work phone"><Input type="tel" inputMode="tel" value={oneOff.work_phone} onChange={(e) => setOneOff({ ...oneOff, work_phone: e.target.value })} /></Field>
              <Field label="Cell phone"><Input type="tel" inputMode="tel" value={oneOff.cell_phone} onChange={(e) => setOneOff({ ...oneOff, cell_phone: e.target.value })} /></Field>
            </div>
            <Button onClick={handleOneOff} disabled={saving} className="w-full h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add one-off contact"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
