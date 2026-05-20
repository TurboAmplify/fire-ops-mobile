import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, CheckCircle2, Plus } from "lucide-react";
import {
  listFinanceOfficers,
  listRegions,
  createFinanceOfficer,
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
  const addContact = (extra: Parameters<typeof addTruckFinanceContact>[0] extends infer _ ? Omit<Parameters<typeof addIncidentFinanceContact>[0], "incident_id" | "organization_id"> : never) => {
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
  const [regionId, setRegionId] = useState<string | "all" | null>(defaultRegionId || null);
  const [search, setSearch] = useState("");
  const [officers, setOfficers] = useState<FinanceOfficer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New officer form
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dispatch_office: "",
    region_id: defaultRegionId ?? "",
    agency: "",
    notes: "",
  });

  // One-off contact form
  const [oneOff, setOneOff] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    if (!open) return;
    listRegions().then(setRegions).catch(() => {});
    setRegionId(defaultRegionId || null);
  }, [open, defaultRegionId]);

  useEffect(() => {
    if (!open || tab !== "directory") return;
    setLoading(true);
    listFinanceOfficers({
      regionId: regionId === "all" || !regionId ? null : regionId,
      search,
    })
      .then(setOfficers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, tab, regionId, search]);

  const handlePick = async (o: FinanceOfficer) => {
    setSaving(true);
    try {
      await addContact({ finance_officer_id: o.id, role: defaultRole });
      recordOfficerUse(o.id).catch(() => {});
      toast.success(`${o.name} added as finance contact`);
      onAdded?.();
      onOpenChange(false);
      recordOfficerUse(o.id).catch(() => {});
      toast.success(`${o.name} added as finance contact`);
      onAdded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setSaving(false);
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
      await addTruckFinanceContact({
        incident_truck_id: incidentTruckId,
        organization_id: organizationId,
        finance_officer_id: officer.id,
        role: defaultRole,
      });
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
      await addTruckFinanceContact({
        incident_truck_id: incidentTruckId,
        organization_id: organizationId,
        name_override: oneOff.name || undefined,
        email_override: oneOff.email,
        phone_override: oneOff.phone || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add finance contact</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="new">New officer</TabsTrigger>
            <TabsTrigger value="oneoff">One-off</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Select value={regionId ?? "all"} onValueChange={(v) => setRegionId(v === "all" ? null : v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, office"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {defaultRegionId && regionId === defaultRegionId && (
              <p className="text-xs text-muted-foreground">
                Showing officers matched to incident region <strong>{defaultRegionId}</strong>.
              </p>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : officers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No officers found. Try a different region or add a new one.
                </p>
              ) : (
                officers.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handlePick(o)}
                    disabled={saving}
                    className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{o.name}</span>
                      {o.verified_at && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{o.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {o.region_id && <Badge variant="secondary" className="text-xs">{o.region_id}</Badge>}
                      {o.dispatch_office && <Badge variant="outline" className="text-xs">{o.dispatch_office}</Badge>}
                      {o.agency && <Badge variant="outline" className="text-xs">{o.agency}</Badge>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Adds to the shared directory — visible to all crews.
            </p>
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
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
            <Button onClick={handleCreateNew} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Save and add</>}
            </Button>
          </TabsContent>

          <TabsContent value="oneoff" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Use only for one-time contacts (not saved to directory).
            </p>
            <Field label="Name"><Input value={oneOff.name} onChange={(e) => setOneOff({ ...oneOff, name: e.target.value })} /></Field>
            <Field label="Email *"><Input type="email" value={oneOff.email} onChange={(e) => setOneOff({ ...oneOff, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={oneOff.phone} onChange={(e) => setOneOff({ ...oneOff, phone: e.target.value })} /></Field>
            <Button onClick={handleOneOff} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add one-off contact"}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
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
