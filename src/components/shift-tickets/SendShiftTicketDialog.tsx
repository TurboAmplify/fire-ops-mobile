import { useEffect, useState } from "react";
import { Loader2, Send, Mail, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  listIncidentFinanceContacts,
  contactDisplayName,
  contactDisplayEmail,
  type IncidentTruckFinanceContact,
} from "@/services/incident-truck-finance-contacts";
import { useCreateThread } from "@/hooks/useThreads";
import { sendReply } from "@/services/threads";
import { supabase } from "@/integrations/supabase/client";
import { generateOF297PdfBlob } from "./generateOF297Pdf";
import { handleMutationError } from "@/lib/offline-guard";
import type { ShiftTicket } from "@/services/shift-tickets";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: ShiftTicket | null;
  incidentId: string;
  organizationId: string;
}

export function SendShiftTicketDialog({
  open,
  onOpenChange,
  ticket,
  incidentId,
  organizationId,
}: Props) {
  const [contacts, setContacts] = useState<IncidentTruckFinanceContact[]>([]);
  const [contactId, setContactId] = useState<string>("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sent, setSent] = useState<null | {
    threadId: string;
    recipientName: string;
    recipientEmail: string;
    fileName: string;
    sentAt: string;
  }>(null);
  const create = useCreateThread();
  const nav = useNavigate();

  useEffect(() => {
    if (!open || !incidentId) return;
    setLoadingContacts(true);
    listIncidentFinanceContacts(incidentId)
      .then((rows) => {
        // Only show contacts opted in to receive shift tickets
        const filtered = rows.filter((r) => r.receives_shift_tickets !== false);
        setContacts(filtered);
        if (filtered[0]) setContactId(filtered[0].id);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
    const dateStr = ticket?.equipment_entries?.[0]?.date ?? "";
    const incName = ticket?.incident_name ?? "incident";
    setBody(
      `Hello,\n\nAttached is the OF-297 shift ticket for ${incName}${dateStr ? ` (${dateStr})` : ""}.\n\nPlease let me know if you have any questions.\n\nThanks,`
    );
    setSent(null);
  }, [open, incidentId, ticket]);

  const handleSend = async () => {
    if (!ticket?.id) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      toast.error("Pick a finance officer first");
      return;
    }
    setLoading(true);
    try {
      // 1. Generate PDF
      const { blob, fileName } = await generateOF297PdfBlob(ticket);
      // 2. Upload to communication-attachments bucket (org-scoped path)
      const path = `${organizationId}/shift-tickets/${ticket.id}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("communication-attachments")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      // 3. Create thread
      const subjectDate = ticket.equipment_entries?.[0]?.date ?? "";
      const subject = `Shift Ticket — ${ticket.incident_name ?? "Incident"}${subjectDate ? ` ${subjectDate}` : ""} — ${fileName.replace(/\.pdf$/i, "")}`;
      const thread = await create.mutateAsync({
        incidentId,
        incidentTruckId: ticket.incident_truck_id,
        contactId: contact.id,
        financeOfficerId: contact.finance_officer_id ?? null,
        purpose: "shift_ticket",
        subject,
      });
      // 4. Send reply with attachment
      await sendReply(thread.id, body.trim() || "Shift ticket attached.", [path], {
        incidentId,
        incidentTruckId: ticket.incident_truck_id,
        documentLabel: `Shift Ticket ${subjectDate || ticket.id.slice(0, 8)}`,
      });

      toast.success("Shift ticket sent to finance officer");
      onOpenChange(false);
      nav(`/messages/${thread.id}`);
    } catch (e) {
      handleMutationError(e, "Could not send shift ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send shift ticket?
          </DialogTitle>
          <DialogDescription>
            Email this OF-297 as a PDF to a finance officer on this incident.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              To
            </label>
            {loadingContacts ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading contacts…
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No finance contacts on this incident. Add one from the incident Overview tab first.
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Message
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            The OF-297 PDF will be attached automatically. Replies come back into Messages.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Not now
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || contacts.length === 0 || !contactId}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
