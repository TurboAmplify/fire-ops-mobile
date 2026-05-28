import { Bell, Inbox } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppNotifications, type AppNotification } from "@/hooks/useAppNotifications";

function defaultLink(n: AppNotification): string {
  if (n.link_path) return n.link_path;
  if (n.thread_id) return `/messages/${n.thread_id}`;
  if (n.incident_id) return `/incidents/${n.incident_id}`;
  return "/messages";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, isLoading, markRead, markAllRead } =
    useAppNotifications();
  const nav = useNavigate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-foreground/80 active:bg-primary/10 transition-colors"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-[18px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[min(92vw,360px)] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs font-medium text-primary"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Inbox className="h-6 w-6 text-muted-foreground/60 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">
                You're all caught up.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => {
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        if (unread) markRead(n.id);
                        setOpen(false);
                        nav(defaultLink(n));
                      }}
                      className={`w-full text-left px-3 py-2.5 flex gap-2.5 active:bg-muted/60 transition-colors ${
                        unread ? "bg-primary/5" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          unread ? "bg-primary" : "bg-transparent"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
