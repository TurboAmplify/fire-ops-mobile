import { Loader2, Inbox, Plus } from "lucide-react";
import { useThreadList } from "@/hooks/useThreads";
import { ThreadListItem } from "./ThreadListItem";
import { useState } from "react";
import { NewThreadSheet } from "./NewThreadSheet";

interface Props {
  incidentId?: string;
  /** When embedded inside an incident detail tab, show the "Start a thread" button. */
  showCompose?: boolean;
}

export function MessagesInbox({ incidentId, showCompose }: Props) {
  const { data, isLoading, error } = useThreadList({ incidentId });
  const [composeOpen, setComposeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive p-4">Could not load messages.</p>;
  }

  const items = data ?? [];
  return (
    <div className="space-y-3">
      {showCompose && incidentId && (
        <div className="flex justify-end">
          <button
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground touch-target"
          >
            <Plus className="h-4 w-4" />
            Start a thread
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center card-shadow">
          <Inbox className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Replies from finance officers will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
          {items.map((t) => (
            <ThreadListItem key={t.id} item={t} />
          ))}
        </div>
      )}

      {showCompose && incidentId && (
        <NewThreadSheet open={composeOpen} onOpenChange={setComposeOpen} incidentId={incidentId} />
      )}
    </div>
  );
}
