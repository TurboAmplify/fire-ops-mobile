import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Loader2 } from "lucide-react";
import { useMarkThreadRead, useThread } from "@/hooks/useThreads";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { ReplyComposer } from "@/components/messages/ReplyComposer";

const PURPOSE_LABEL: Record<string, string> = {
  general: "General",
  shift_ticket: "Shift",
  demob: "Demob",
  of286: "OF-286",
};

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const { data, isLoading, error } = useThread(threadId);
  const markRead = useMarkThreadRead();
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef(false);

  useEffect(() => {
    if (!threadId || markedRef.current) return;
    if (data?.thread && data.thread.unread_count > 0) {
      markedRef.current = true;
      markRead.mutate(threadId);
    }
  }, [data, threadId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [data?.messages.length]);

  if (isLoading) {
    return (
      <AppShell title="Message">
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (error || !data) {
    return (
      <AppShell title="Message">
        <p className="text-sm text-destructive p-4">Could not load thread.</p>
      </AppShell>
    );
  }

  const { thread, messages, attachmentsByMessage } = data;
  const isClosed = thread.status === "closed";

  return (
    <AppShell title={thread.subject || "Message"}>
      <div className="flex flex-col min-h-[calc(100vh-8rem)]">
        <div className="px-4 pt-3 pb-2 border-b border-border/60 space-y-1 bg-card/40">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider rounded-full bg-secondary/60 px-1.5 py-0.5">
              {PURPOSE_LABEL[thread.purpose] ?? thread.purpose}
            </span>
            {thread.incident_id && (
              <Link
                to={`/incidents/${thread.incident_id}`}
                className="text-xs text-primary font-medium"
              >
                View incident →
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 p-3 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No messages in this thread yet.</p>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                attachments={attachmentsByMessage[m.id] ?? []}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <ReplyComposer threadId={thread.id} disabled={isClosed} />
      </div>
    </AppShell>
  );
}
