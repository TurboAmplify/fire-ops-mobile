import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useCrew, useDeleteCrew, useUpdateCrew, useAssignMemberToCrew } from "@/hooks/useCrews";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { Loader2, Users, Trash2, UserPlus, UserMinus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CrewDetail() {
  const { crewId = "" } = useParams<{ crewId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: crew, isLoading } = useCrew(crewId);
  const { data: allMembers } = useCrewMembers();
  const updateCrew = useUpdateCrew();
  const deleteCrew = useDeleteCrew();
  const assignMember = useAssignMemberToCrew();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const assigned = useMemo(
    () => (allMembers ?? []).filter((m: any) => m.crew_id === crewId),
    [allMembers, crewId],
  );
  const unassigned = useMemo(
    () => (allMembers ?? []).filter((m: any) => m.crew_id !== crewId && m.active !== false),
    [allMembers, crewId],
  );

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === crew?.name) {
      setEditingName(false);
      return;
    }
    try {
      await updateCrew.mutateAsync({ id: crewId, updates: { name: name.trim() } });
      setEditingName(false);
      toast({ title: "Saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAssign = async (memberId: string) => {
    try {
      await assignMember.mutateAsync({ memberId, crewId });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUnassign = async (memberId: string) => {
    try {
      await assignMember.mutateAsync({ memberId, crewId: null });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCrew.mutateAsync(crewId);
      toast({ title: "Crew deleted" });
      navigate("/crews");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Loading...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!crew) {
    return (
      <AppShell title="Not found">
        <p className="p-4 text-center text-muted-foreground">Crew not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={crew.name} showBack onBack={() => navigate("/crews")}>
      <div className="p-4 space-y-5">
        {/* Name editor */}
        <section className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 shrink-0">
              <Users className="h-6 w-6 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground touch-target"
                    aria-label="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setName(crew.name);
                    setEditingName(true);
                  }}
                  className="text-left w-full"
                >
                  <p className="text-base font-bold truncate">{crew.name}</p>
                  <p className="text-[11px] text-muted-foreground">Tap to rename</p>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Assigned members */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Members ({assigned.length})
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60">
            {assigned.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No members yet — add some from the list below.
              </p>
            )}
            {assigned.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  {m.role && (
                    <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                  )}
                </div>
                <button
                  onClick={() => handleUnassign(m.id)}
                  disabled={assignMember.isPending}
                  className="flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium text-muted-foreground active:bg-secondary touch-target"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Add members */}
        {unassigned.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Add members
            </h2>
            <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60">
              {unassigned.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    {(m as any).crew_id && (
                      <p className="text-[11px] text-muted-foreground">In another crew</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAssign(m.id)}
                    disabled={assignMember.isPending}
                    className="flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground touch-target"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="pt-4">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive touch-target"
          >
            <Trash2 className="h-4 w-4" />
            Delete crew
          </button>
        </section>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this crew?</AlertDialogTitle>
            <AlertDialogDescription>
              Members will be unassigned but not deleted. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
