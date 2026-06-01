import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import type { ThreadListItem as TItem } from "@/services/threads";
import { ArrowDownLeft, ArrowUpRight, Paperclip, PenLine, Eye, CheckCircle2 } from "lucide-react";

const PURPOSE_LABEL: Record<string, string> = {
  general: "General",
  shift_ticket: "Shift",
  demob: "Demob",
  of286: "OF-286",
  red_cards: "Red Cards",
};


export function ThreadListItem({ item }: { item: TItem }) {
  const nav = useNavigate();
  const when = item.last_message_at
    ? formatDistanceToNowStrict(new Date(item.last_message_at), { addSuffix: false })
    : "";
  const unread = (item.unread_count ?? 0) > 0;
  return (
    <button
      onClick={() => nav(`/messages/${item.id}`)}
      className="w-full text-left px-4 py-3 flex gap-3 items-start active:bg-secondary/50 transition-colors touch-target"
    >
      <div className="mt-1 shrink-0">
        {unread ? (
          <span className="block h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
        ) : item.last_message_direction === "out" ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={`text-sm truncate ${unread ? "font-bold" : "font-medium"}`}>{item.subject}</p>
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{when}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.counterparty_name || item.counterparty_email || "—"}
        </p>
        {item.last_snippet && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.last_snippet}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider rounded-full bg-secondary/60 px-1.5 py-0.5">
            {PURPOSE_LABEL[item.purpose] ?? item.purpose}
          </span>
          {item.attachment_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {item.attachment_count}
            </span>
          )}
          {item.needs_signature && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-primary/15 text-primary px-1.5 py-0.5">
              <PenLine className="h-3 w-3" />
              Needs signature
            </span>
          )}
          {item.incident_name && (
            <span className="text-[10px] text-muted-foreground truncate">{item.incident_name}</span>
          )}
        </div>

      </div>
    </button>
  );
}
