import { Loader2, Inbox, Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useThreadList } from "@/hooks/useThreads";
import { ThreadListItem } from "./ThreadListItem";
import { useMemo, useState } from "react";
import { NewThreadSheet } from "./NewThreadSheet";
import type { ThreadListItem as TItem } from "@/services/threads";

interface Props {
  incidentId?: string;
  /** When embedded inside an incident detail tab, show the "Start a thread" button. */
  showCompose?: boolean;
}

export function MessagesInbox({ incidentId, showCompose }: Props) {
  const { data, isLoading, error } = useThreadList({ incidentId });
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groupByIncident, setGroupByIncident] = useState(!incidentId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const items = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) => {
      return (
        t.subject?.toLowerCase().includes(q) ||
        t.counterparty_name?.toLowerCase().includes(q) ||
        t.counterparty_email?.toLowerCase().includes(q) ||
        t.last_snippet?.toLowerCase().includes(q) ||
        t.incident_name?.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const grouped = useMemo(() => {
    if (!groupByIncident) return null;
    const groups = new Map<string, { name: string; items: TItem[] }>();
    for (const t of filtered) {
      const key = t.incident_id ?? "__none__";
      const name = t.incident_name ?? "No incident";
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(t);
    }
    // Sort: real incidents first (by most recent thread), no-incident last.
    return Array.from(groups.entries())
      .sort(([ak, av], [bk, bv]) => {
        if (ak === "__none__") return 1;
        if (bk === "__none__") return -1;
        const aT = av.items[0]?.last_message_at ?? "";
        const bT = bv.items[0]?.last_message_at ?? "";
        return bT.localeCompare(aT);
      });
  }, [filtered, groupByIncident]);

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

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject or sender"
              className="w-full rounded-xl bg-card border border-border/60 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 touch-target"
            />
          </div>
          {!incidentId && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setGroupByIncident(true)}
                className={`px-2.5 py-1 rounded-full ${groupByIncident ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"}`}
              >
                By incident
              </button>
              <button
                onClick={() => setGroupByIncident(false)}
                className={`px-2.5 py-1 rounded-full ${!groupByIncident ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"}`}
              >
                Flat
              </button>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {filtered.length} of {items.length}
              </span>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center card-shadow">
          <Inbox className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm font-medium">
            {items.length === 0 ? "No messages yet" : "No matches"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length === 0
              ? "Replies, OF-286s, demob acks, and red-card threads will show up here."
              : "Try a different search term."}
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-3">
          {grouped.map(([key, group]) => {
            const isCollapsed = collapsed.has(key);
            return (
              <div key={key} className="rounded-2xl bg-card overflow-hidden card-shadow">
                <button
                  onClick={() => toggleGroup(key)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left active:bg-secondary/40 touch-target"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                    {group.name}
                  </p>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {group.items.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-border/60 border-t border-border/60">
                    {group.items.map((t) => (
                      <ThreadListItem key={t.id} item={t} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
          {filtered.map((t) => (
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
