import { AppShell } from "@/components/AppShell";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { Plus, Loader2, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CrewMemberForm } from "@/components/crew/CrewMemberForm";
import { SignedImage } from "@/components/ui/SignedImage";
import { formatPhone } from "@/lib/phone";
import { isCrewMemberComplete } from "@/lib/profile-completion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CachedDataPill, OfflineNoCacheEmpty } from "@/components/OfflineIndicators";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Crew() {
  const { data: members, isLoading, error } = useCrewMembers();
  const { isOffline } = useOnlineStatus();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: /crew?edit=<memberId> auto-opens that member's edit form
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && members?.some((m) => m.id === editId)) {
      setEditingId(editId);
      setShowForm(true);
    }
  }, [searchParams, members]);

  const filtered = members?.filter((m) => {
    if (filter === "active") return m.active;
    if (filter === "inactive") return !m.active;
    return true;
  });

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
    if (searchParams.get("edit")) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <AppShell
      title="Crew"
      headerRight={
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors touch-target ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isOffline && members && members.length > 0 && <CachedDataPill />}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !isOffline && (
          <p className="py-12 text-center text-destructive">Failed to load crew members.</p>
        )}

        {!isLoading && isOffline && !members && <OfflineNoCacheEmpty label="crew" />}

        {!isLoading && !error && members && (
          <div className="space-y-2">
            {filtered?.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">No crew members found.</p>
            )}
            {filtered?.map((m) => {
              const photoUrl = (m as any).profile_photo_url;
              return (
                <button
                  key={m.id}
                  onClick={() => handleEdit(m.id)}
                  className="block w-full text-left rounded-xl bg-card p-4 transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-accent shrink-0 border-2 border-primary/10">
                      {photoUrl ? (
                        <SignedImage src={photoUrl} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-sm font-bold text-accent-foreground">
                            {getInitials(m.name)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">{m.name}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isCrewMemberComplete(m) && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                              Incomplete
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              m.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {m.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{m.role}</span>
                      </div>
                      {m.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{formatPhone(m.phone)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showForm && <CrewMemberForm memberId={editingId} onClose={handleClose} />}
    </AppShell>
  );
}
