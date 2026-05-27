import { useState } from "react";
import { Loader2, Plus, ShieldCheck, Pencil } from "lucide-react";
import { useRedCardByMember, useRedCardsEnabled } from "@/hooks/useRedCards";
import { useOrganization } from "@/hooks/useOrganization";
import { RedCardCard } from "@/components/crew/RedCardCard";
import { RedCardEditor } from "@/components/crew/RedCardEditor";

interface Props {
  crewMemberId: string;
  memberName: string;
}

/**
 * Admin-facing Red Card section embedded in the crew member form.
 * Renders nothing when the per-org flag is off.
 */
export function CrewMemberRedCardSection({ crewMemberId, memberName }: Props) {
  const enabled = useRedCardsEnabled();
  const { isAdmin } = useOrganization();
  const { data: card, isLoading } = useRedCardByMember(crewMemberId);
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Red Card
        </h3>
        {isAdmin && card && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary touch-target"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : card ? (
        <RedCardCard card={card} memberName={memberName} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No Red Card on file.</p>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground touch-target"
            >
              <Plus className="h-4 w-4" />
              Add Red Card
            </button>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">An admin can add one for this member.</p>
          )}
        </div>
      )}

      {open && (
        <RedCardEditor
          crewMemberId={crewMemberId}
          memberName={memberName}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
