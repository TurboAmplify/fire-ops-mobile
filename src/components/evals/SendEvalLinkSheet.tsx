import { useState } from "react";
import { Send, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shareLink, copyLink } from "@/lib/native-share-link";
import { evalShareUrl } from "@/lib/eval-225";

interface Props {
  open: boolean;
  onClose: () => void;
  token: string;
  /** "request" = ask an outside supervisor to rate our crew member.
   *  "acknowledge" = send a finished eval to the person rated to sign.
   *  "view" = share a signed eval so anyone with the link can read and download it. */
  mode: "request" | "acknowledge" | "view";
  subjectName: string;
  fireName: string;
  defaultPhone?: string | null;
}

export function SendEvalLinkSheet({ open, onClose, token, mode, subjectName, fireName, defaultPhone }: Props) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = evalShareUrl(token);

  const message =
    mode === "request"
      ? `Performance eval (ICS-225) for ${subjectName || "our crew member"}${fireName ? ` on the ${fireName}` : ""}. Tap the link to fill it out and sign — no app or login needed.`
      : `Your performance eval (ICS-225)${fireName ? ` for the ${fireName}` : ""} is ready to review and sign. Tap the link — no app or login needed.`;

  const send = async () => {
    setBusy(true);
    const outcome = await shareLink({ text: message, url, title: "Performance eval", phone });
    setBusy(false);
    if (outcome === "shared") toast.success("Link ready to send");
    else if (outcome === "sms") toast.success("Opening your messages app");
    else if (outcome === "copied") toast.success("Link copied — paste it into a text");
    else toast.error("Couldn't share the link. Copy it instead.");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,var(--app-safe-bottom))]">
        <SheetHeader>
          <SheetTitle>{mode === "request" ? "Send eval request" : "Send for signature"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-secondary/60 p-3 text-[12px] leading-relaxed text-muted-foreground">
            {message}
            <div className="mt-1 break-all font-mono text-[11px] text-foreground">{url}</div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Phone number (optional)
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="Used only if your device needs it"
              className="h-12 text-base"
            />
          </div>

          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Send by text
          </button>

          <button
            type="button"
            onClick={async () => {
              const ok = await copyLink(url);
              setCopied(ok);
              toast[ok ? "success" : "error"](ok ? "Link copied" : "Couldn't copy the link");
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            Copy link
          </button>

          <p className="text-[11px] text-muted-foreground">
            On the app, this opens your phone's share sheet so you can pick Messages and a contact — nothing to copy or
            paste.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
