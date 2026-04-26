import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useCrews, useCreateCrew } from "@/hooks/useCrews";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { Plus, Loader2, Users, ChevronRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { countCrewMembers } from "@/lib/profile-completion";

export default function Crews() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: crews, isLoading, error } = useCrews();
  const { data: members } = useCrewMembers();
  const createCrew = useCreateCrew();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCrew.mutateAsync({ name: name.trim() });
      toast({ title: "Crew created", description: name.trim() });
      setName("");
      setShowForm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Couldn't create crew", variant: "destructive" });
    }
  };

  return (
    <AppShell
      title="Hand Crews"
      headerRight={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      }
    >
      <div className="p-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-12 text-center text-destructive">Failed to load crews.</p>
        )}

        {!isLoading && !error && crews?.length === 0 && (
          <div className="rounded-2xl bg-card border border-border/40 p-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15">
                <Users className="h-6 w-6 text-violet-500" />
              </div>
            </div>
            <p className="text-sm font-semibold">No hand crews yet</p>
            <p className="text-xs text-muted-foreground">
              Hand crews are groups of people you can dispatch as a unit.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground touch-target"
            >
              Add your first crew
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
          {crews?.map((crew) => {
            const memberCount = countCrewMembers(crew.id, members ?? []);
            const isEmpty = memberCount === 0;
            return (
              <button
                key={crew.id}
                onClick={() => navigate(`/crews/${crew.id}`)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 touch-target"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 shrink-0">
                  <Users className="h-[18px] w-[18px] text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{crew.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {memberCount} {memberCount === 1 ? "member" : "members"}
                  </p>
                </div>
                {isEmpty && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Empty
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Add a hand crew</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="crew-name">Crew name</Label>
              <Input
                id="crew-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Crew 7"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={createCrew.isPending || !name.trim()}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground touch-target disabled:opacity-50"
            >
              {createCrew.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Create crew"}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
