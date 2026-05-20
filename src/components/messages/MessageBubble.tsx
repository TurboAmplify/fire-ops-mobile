import { format } from "date-fns";
import type { AttachmentRow, MessageRow } from "@/services/threads";
import { AttachmentChip } from "./AttachmentChip";

export function MessageBubble({ msg, attachments }: { msg: MessageRow; attachments: AttachmentRow[] }) {
  const isOut = msg.direction === "out";
  const ts = msg.sent_at ?? msg.received_at ?? msg.created_at;
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isOut
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card text-foreground rounded-bl-md border border-border"
        }`}
      >
        <div className={`text-[10px] mb-1 ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {(msg.from_name || msg.from_email)} · {format(new Date(ts), "MMM d, h:mm a")}
          {msg.send_status === "failed" && <span className="ml-2 text-destructive">Failed</span>}
          {msg.send_status === "pending" && <span className="ml-2 opacity-70">Sending…</span>}
        </div>
        {msg.body_text ? (
          <p className="whitespace-pre-wrap break-words">{msg.body_text}</p>
        ) : msg.body_html_sanitized ? (
          <div
            className="prose prose-sm max-w-none [&_*]:!text-inherit"
            dangerouslySetInnerHTML={{ __html: msg.body_html_sanitized }}
          />
        ) : (
          <p className="opacity-60 italic">(no content)</p>
        )}
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} att={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
