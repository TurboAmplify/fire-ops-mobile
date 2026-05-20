import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useDraft, useSaveDraft, useSendReply } from "@/hooks/useThreads";
import { handleMutationError } from "@/lib/offline-guard";
import { toast } from "sonner";

export function ReplyComposer({ threadId, disabled }: { threadId: string; disabled?: boolean }) {
  const { data: initialDraft } = useDraft(threadId);
  const saveDraft = useSaveDraft();
  const sendReply = useSendReply(threadId);
  const [body, setBody] = useState("");
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current && initialDraft !== undefined) {
      setBody(initialDraft);
      hydratedRef.current = true;
    }
  }, [initialDraft]);

  // Debounced draft save
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      saveDraft.mutate({ threadId, body });
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, threadId]);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    try {
      await sendReply.mutateAsync(text);
      setBody("");
      toast.success("Reply sent");
    } catch (e) {
      handleMutationError(e, "Failed to send reply");
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-3 pb-[calc(0.75rem+var(--app-safe-bottom,0px))]">
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a reply…"
          rows={2}
          disabled={disabled || sendReply.isPending}
          className="flex-1 resize-none min-h-[44px] max-h-40"
        />
        <button
          onClick={handleSend}
          disabled={disabled || sendReply.isPending || !body.trim()}
          className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:opacity-80 shrink-0"
          aria-label="Send reply"
        >
          {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
