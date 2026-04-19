import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useTrainingRecords,
  useCreateTrainingRecord,
  useDeleteTrainingRecord,
} from "@/hooks/useTraining";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useAppMode } from "@/lib/app-mode";
import { Loader2, Plus, GraduationCap, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";

export default function Training() {
  const { terms } = useAppMode();
  const { data: records, isLoading, error } = useTrainingRecords();
  const { data: crew } = useCrewMembers();
  const createMutation = useCreateTrainingRecord();
  const deleteMutation = useDeleteTrainingRecord();
  const [open, setOpen] = useState(false);

  const [crewMemberId, setCrewMemberId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [hours, setHours] = useState("");

  const reset = () => {
    setCrewMemberId(""); setCourseName(""); setCompletedAt(""); setExpiresAt(""); setHours("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewMemberId || !courseName.trim()) {
      toast.error("Pick a person and course name");
      return;
    }
    try {
      await createMutation.mutateAsync({
        crew_member_id: crewMemberId,
        course_name: courseName.trim(),
        completed_at: completedAt || null,
        expires_at: expiresAt || null,
        hours: hours ? parseFloat(hours) : null,
        certificate_url: null,
        notes: null,
      });
      toast.success("Training added");
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this training record?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AppShell title="Training">
      <div className="p-4 space-y-4">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground touch-target active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Add Training Record
        </button>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm text-destructive">Failed to load training records.</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          </div>
        ) : !records || records.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No training records yet.</p>
            <p className="text-xs text-muted-foreground">Track courses and certifications for your {terms.crew.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r: any) => {
              const expired = r.expires_at && isBefore(new Date(r.expires_at), new Date());
              return (
                <div key={r.id} className="rounded-xl bg-card p-4 card-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{r.course_name}</p>
                      <p className="text-xs text-muted-foreground">{r.crew_members?.name ?? "—"}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px]">
                        {r.completed_at && (
                          <span className="text-muted-foreground">
                            Completed {format(new Date(r.completed_at), "MMM d, yyyy")}
                          </span>
                        )}
                        {r.expires_at && (
                          <span className={expired ? "text-destructive font-medium" : "text-muted-foreground"}>
                            Expires {format(new Date(r.expires_at), "MMM d, yyyy")}
                            {expired && " (expired)"}
                          </span>
                        )}
                        {r.hours != null && (
                          <span className="text-muted-foreground">{r.hours} hrs</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-muted-foreground touch-target p-1"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-background p-4 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Training Record</h2>
              <button onClick={() => setOpen(false)} className="touch-target p-1">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Person *</label>
                <select
                  value={crewMemberId}
                  onChange={(e) => setCrewMemberId(e.target.value)}
                  className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base touch-target"
                  required
                >
                  <option value="">Select a person…</option>
                  {crew?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Course Name *</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. S-130, FFT2 Refresher, EMT-B"
                  className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base touch-target"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Completed</label>
                  <input
                    type="date"
                    value={completedAt}
                    onChange={(e) => setCompletedAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base touch-target"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expires</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base touch-target"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base touch-target"
                  inputMode="decimal"
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground touch-target disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
