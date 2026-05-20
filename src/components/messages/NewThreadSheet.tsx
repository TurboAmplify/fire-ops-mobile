import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { listIncidentFinanceContacts, contactDisplayName, contactDisplayEmail, type IncidentTruckFinanceContact } from "@/services/incident-truck-finance-contacts";
import { useCreateThread } from "@/hooks/useThreads";
import { sendReply, type ThreadPurpose } from "@/services/threads";
import { handleMutationError } from "@/lib/offline-guard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
];

export function NewThreadSheet({ open, onOpenChange, incidentId, defaultSubject }: Props) {
  const [contacts, setContacts] = useState<IncidentTruckFinanceContact[]>([]);
  const [contactId, setContactId] = useState<string>("");
  const [purpose, setPurpose] = useState<ThreadPurpose>("general");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const create = useCreateThread();
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject ?? "");
    setBody("");
    listIncidentFinanceContacts(incidentId)
      .then((rows) => {
        setContacts(rows);
        if (rows[0]) setContactId(rows[0].id);
      })
      .catch(() => setContacts([]));
  }, [open, incidentId, defaultSubject]);

  const handleSend = async () => {
    if (!contactId || !subject.trim() || !body.trim()) {
      toast.error("Pick a contact, subject, and message");
      return;
    }
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    setLoading(true);
    try {
      const thread = await create.mutateAsync({
        incidentId,
        contactId: contact.id,
        financeOfficerId: contact.finance_officer_id ?? null,
        purpose,
        subject: subject.trim(),
      });
      await sendReply(thread.id, body.trim());
      toast.success("Thread started");
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
        <div className="space-y-3 mt-4">
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
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_override || "Contact"} {c.email_override ? `· ${c.email_override}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Purpose</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPurpose(p.value)}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    purpose === p.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
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
            disabled={loading || contacts.length === 0}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground touch-target flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
