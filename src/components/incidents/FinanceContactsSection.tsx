import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  listTruckFinanceContacts,
  listIncidentFinanceContacts,
  removeTruckFinanceContact,
  type IncidentTruckFinanceContact,
} from "@/services/incident-truck-finance-contacts";
import { supabase } from "@/integrations/supabase/client";
import { FinanceOfficerPicker } from "./FinanceOfficerPicker";

interface Props {
  /** Attach contacts to a single truck. Mutually exclusive with incidentId. */
  incidentTruckId?: string;
  /** Attach contacts at the incident level. Mutually exclusive with incidentTruckId. */
  incidentId?: string;
  organizationId: string;
  incidentRegionId?: string | null;
}

interface ResolvedContact extends IncidentTruckFinanceContact {
  display_name: string;
  display_email: string;
  display_work_phone: string | null;
  display_cell_phone: string | null;
}

export function FinanceContactsSection({ incidentTruckId, incidentId, organizationId, incidentRegionId }: Props) {
  const [contacts, setContacts] = useState<ResolvedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const raw = incidentId
        ? await listIncidentFinanceContacts(incidentId)
        : incidentTruckId
          ? await listTruckFinanceContacts(incidentTruckId)
          : [];
      const officerIds = raw.map((c) => c.finance_officer_id).filter(Boolean) as string[];
      const officersById: Record<string, { name: string; email: string; phone: string | null; work_phone: string | null; cell_phone: string | null }> = {};
      if (officerIds.length) {
        const { data } = await supabase
          .from("finance_officers")
          .select("id, name, email, phone, work_phone, cell_phone")
          .in("id", officerIds);
        for (const o of data ?? []) {
          officersById[o.id] = { name: o.name, email: o.email, phone: o.phone, work_phone: o.work_phone, cell_phone: o.cell_phone };
        }
      }
      const resolved: ResolvedContact[] = raw.map((c) => {
        const o = c.finance_officer_id ? officersById[c.finance_officer_id] : null;
        return {
          ...c,
          display_name: c.name_override || o?.name || "(no name)",
          display_email: c.email_override || o?.email || "",
          display_work_phone: c.work_phone_override || o?.work_phone || null,
          display_cell_phone: c.cell_phone_override || o?.cell_phone || c.phone_override || o?.phone || null,
        };
      });
      setContacts(resolved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [incidentTruckId, incidentId]);

  const handleRemove = async (id: string) => {
    try {
      await removeTruckFinanceContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contact removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading contacts…
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No finance contacts yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/40">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium truncate">{c.display_name}</span>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {c.role === "both" ? "shifts + demob" : c.role.replace("_", " ")}
                  </Badge>
                  {!c.finance_officer_id && <Badge variant="outline" className="text-[10px] h-4">one-off</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{c.display_email}</span>
                </div>
                {c.display_work_phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{c.display_work_phone}</span>
                    <span className="text-[10px] uppercase tracking-wide">work</span>
                  </div>
                )}
                {c.display_cell_phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{c.display_cell_phone}</span>
                    <span className="text-[10px] uppercase tracking-wide">cell</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(c.id)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="w-full h-8">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add finance contact
      </Button>

      <FinanceOfficerPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        incidentTruckId={incidentTruckId}
        incidentId={incidentId}
        organizationId={organizationId}
        defaultRegionId={incidentRegionId}
        onAdded={load}
      />
    </div>
  );
}
