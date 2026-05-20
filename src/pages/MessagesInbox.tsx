import { AppShell } from "@/components/AppShell";
import { MessagesInbox } from "@/components/messages/MessagesInbox";

export default function MessagesInboxPage() {
  return (
    <AppShell title="Messages">
      <div className="p-4">
        <MessagesInbox />
      </div>
    </AppShell>
  );
}
