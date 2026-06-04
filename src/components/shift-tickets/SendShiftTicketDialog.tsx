import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { sendReply, findShiftTicketThreads } from "@/services/threads";
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

interface PriorSend {
  threadId: string;
  toEmails: string[];
  lastSentAt: string | null;
}

export function SendShiftTicketDialog({
  open,
  onOpenChange,
  ticket,
  incidentId,
  organizationId,
}: Props) {
  const [contacts, setContacts] = useState<IncidentTruckFinanceContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [priorSends, setPriorSends] = useState<PriorSend[]>([]);
  const [confirmResend, setConfirmResend] = useState(false);
  const [sent, setSent] = useState<null | {
    threadId: string;
    recipients: { name: string; email: string }[];
    fileName: string;
    sentAt: string;
  }>(null);
  const create = useCreateThread();
  const nav = useNavigate();

  const ticketDate = ticket?.equipment_entries?.[0]?.date ?? "";

  useEffect(() => {
    if (!open || !incidentId) return;
    setLoadingContacts(true);
    setSent(null);
    setConfirmResend(false);
    listIncidentFinanceContacts(incidentId)
      .then((rows) => {
        const filtered = rows.filter((r) => r.receives_shift_tickets !== false);
        setContacts(filtered);
        // Default: pre-check every eligible contact so the user is reminded
        // they're sending to everyone, but can uncheck before sending.
        setSelectedIds(new Set(filtered.map((r) => r.id)));
      })
      .catch(() => {
        setContacts([]);
        setSelectedIds(new Set());
      })
      .finally(() => setLoadingContacts(false));

    const incName = ticket?.incident_name ?? "incident";
    setBody(
      `Hello,\n\nAttached is the OF-297 shift ticket for ${incName}${ticketDate ? ` (${ticketDate})` : ""}.\n\nPlease let me know if you have any questions.\n\nThanks,`,
    );

    // Look up any previous sends of this same ticket
    if (ticket?.incident_truck_id && ticketDate) {
      findShiftTicketThreads({
        incidentTruckId: ticket.incident_truck_id,
        ticketDate,
      })
        .then((rows) => {
          const withSends = rows
            .filter((r) => r.last_sent_at)
            .map((r) => ({
              threadId: r.id,
              toEmails: r.to_emails,
              lastSentAt: r.last_sent_at,
            }));
          setPriorSends(withSends);
        })
        .catch(() => setPriorSends([]));
    } else {
      setPriorSends([]);
    }
  }, [open, incidentId, ticket, ticketDate]);

  const alreadySentTo = useMemo(() => {
    const set = new Set<string>();
    for (const p of priorSends) for (const e of p.toEmails) set.add(e.toLowerCase());
    return set;
  }, [priorSends]);

  const mostRecentSendMs = useMemo(() => {
    let best = 0;
    for (const p of priorSends) {
      if (!p.lastSentAt) continue;
      const t = new Date(p.lastSentAt).getTime();
      if (t > best) best = t;
    }
    return best;
  }, [priorSends]);

  const minutesSinceLastSend = useMemo(() => {
    if (!mostRecentSendMs) return null;
    return Math.max(0, Math.round((Date.now() - mostRecentSendMs) / 60000));
  }, [mostRecentSendMs]);

  const recentSendWarning =
    minutesSinceLastSend !== null && minutesSinceLastSend < 10;

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds],
  );

  const willResendTo = useMemo(
    () =>
      selectedContacts.filter((c) => {
        const e = contactDisplayEmail(c)?.toLowerCase();
        return e && alreadySentTo.has(e);
      }),
    [selectedContacts, alreadySentTo],
  );

  const needsResendConfirm =
    (willResendTo.length > 0 || recentSendWarning) && !confirmResend;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Any selection change resets the re-send confirmation
    setConfirmResend(false);
  }

  const handleSend = async () => {
    if (!ticket?.id) return;
    if (loading) return;
    setLoading(true);
    try {
      if (selectedContacts.length === 0) {
        toast.error("Pick at least one recipient");
        return;
      }
      const recipients = selectedContacts
        .map((c) => ({ contact: c, email: contactDisplayEmail(c) }))
        .filter((r): r is { contact: IncidentTruckFinanceContact; email: string } => !!r.email);
      if (recipients.length === 0) {
        toast.error("None of the selected contacts have an email on file");
        return;
      }
      // 1. Generate PDF
      const { blob, fileName } = await generateOF297PdfBlob(ticket);
      // 2. Upload to communication-attachments bucket
      const path = `${organizationId}/shift-tickets/${ticket.id}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("communication-attachments")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      // 3. Reuse existing shift-ticket thread for this truck+date if one
      // already exists — otherwise create one. Keeps the inbox clean and
      // prevents apparent "duplicate" threads when sending to different FOs
      // at different times for the same ticket.
      const subject = `Shift Ticket — ${ticket.incident_name ?? "Incident"}${ticketDate ? ` ${ticketDate}` : ""} — ${fileName.replace(/\.pdf$/i, "")}`;
      let threadId: string;
      const existing = priorSends[0]?.threadId
        ? priorSends.slice().sort((a, b) => {
            const at = a.lastSentAt ? new Date(a.lastSentAt).getTime() : 0;
            const bt = b.lastSentAt ? new Date(b.lastSentAt).getTime() : 0;
            return bt - at;
          })[0]
        : null;
      if (existing?.threadId) {
        threadId = existing.threadId;
      } else {
        const thread = await create.mutateAsync({
          incidentId,
          incidentTruckId: ticket.incident_truck_id,
          // Keep the primary contact link if there's only one recipient so
          // inbound replies still match the contact; for multi-recipient
          // sends the thread_token in Reply-To handles routing.
          contactId: recipients.length === 1 ? recipients[0].contact.id : null,
          financeOfficerId:
            recipients.length === 1
              ? recipients[0].contact.finance_officer_id ?? null
              : null,
          purpose: "shift_ticket",
          subject,
        });
        threadId = thread.id;
      }

      // 4. Send with explicit multi-recipient override
      await sendReply(threadId, body.trim() || "Shift ticket attached.", [path], {
        incidentId,
        incidentTruckId: ticket.incident_truck_id,
        documentLabel: `Shift Ticket ${ticketDate || ticket.id.slice(0, 8)}`,
        toEmails: recipients.map((r) => r.email),
      });

      toast.success(
        recipients.length === 1
          ? "Shift ticket sent"
          : `Shift ticket sent to ${recipients.length} recipients`,
      );
      setSent({
        threadId,
        recipients: recipients.map((r) => ({
          name: contactDisplayName(r.contact),
          email: r.email,
        })),
        fileName,
        sentAt: new Date().toLocaleString(),
      });
    } catch (e) {
      handleMutationError(e, "Could not send shift ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Shift ticket sent
              </DialogTitle>
              <DialogDescription>
                {sent.recipients.length === 1
                  ? "Confirmation of your email."
                  : `Sent to ${sent.recipients.length} recipients in one message.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    To
                  </span>
                  <ul className="mt-0.5 space-y-0.5">
                    {sent.recipients.map((r) => (
                      <li key={r.email}>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground"> · {r.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Attachment
                  </span>
                  <p className="font-mono text-xs break-all">{sent.fileName}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Sent
                  </span>
                  <p className="text-xs">{sent.sentAt}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Replies will arrive in Messages. A copy is in the thread for your records.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button
                onClick={() => {
                  const tid = sent.threadId;
                  onOpenChange(false);
                  nav(`/messages/${tid}`);
                }}
                className="gap-2"
              >
                View thread
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send shift ticket?
              </DialogTitle>
              <DialogDescription>
                Email this OF-297 as a PDF. Selecting multiple recipients sends one message to
                everyone — no duplicate threads.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recipients
                </label>
                {loadingContacts ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading contacts…
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No finance contacts on this incident are set to receive shift tickets. Add one
                    — or enable the &ldquo;Shift tickets&rdquo; toggle on an existing contact —
                    from the incident Overview tab.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1.5 rounded-md border border-border p-2">
                    {contacts.map((c) => {
                      const email = contactDisplayEmail(c);
                      const checked = selectedIds.has(c.id);
                      const alreadySent = email
                        ? alreadySentTo.has(email.toLowerCase())
                        : false;
                      return (
                        <li
                          key={c.id}
                          className="flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40"
                        >
                          <Checkbox
                            id={`fc-${c.id}`}
                            checked={checked}
                            onCheckedChange={() => toggle(c.id)}
                            className="mt-0.5"
                            disabled={!email}
                          />
                          <label
                            htmlFor={`fc-${c.id}`}
                            className="flex-1 cursor-pointer text-sm leading-snug"
                          >
                            <div className="font-medium">{contactDisplayName(c)}</div>
                            {email ? (
                              <div className="text-xs text-muted-foreground break-all">
                                {email}
                              </div>
                            ) : (
                              <div className="text-xs text-destructive">No email on file</div>
                            )}
                            {alreadySent && (
                              <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Already sent this ticket
                              </div>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {willResendTo.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p>
                        This shift ticket has already been sent to{" "}
                        <span className="font-medium">
                          {willResendTo.map((c) => contactDisplayName(c)).join(", ")}
                        </span>
                        . Sending again will email them a duplicate.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={confirmResend}
                          onCheckedChange={(v) => setConfirmResend(!!v)}
                        />
                        <span>Yes, send again anyway</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

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
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Not now
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  loading ||
                  selectedContacts.length === 0 ||
                  needsResendConfirm
                }
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
                {selectedContacts.length > 1 ? ` (${selectedContacts.length})` : ""}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
