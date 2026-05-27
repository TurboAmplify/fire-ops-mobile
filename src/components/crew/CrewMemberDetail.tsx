import { useEffect, useState } from "react";
import { X, Pencil, Phone, User, StickyNote, Loader2, Maximize2 } from "lucide-react";
import { useCrewMember } from "@/hooks/useCrewMembers";
import { useOrganization } from "@/hooks/useOrganization";
import { useRedCardByMember, useRedCardsEnabled } from "@/hooks/useRedCards";
import { SignedImage } from "@/components/ui/SignedImage";
import { RedCardCard } from "@/components/crew/RedCardCard";
import { RedCardViewer } from "@/components/crew/RedCardViewer";
import { formatPhone } from "@/lib/phone";

interface Props {
  memberId: string;
  onClose: () => void;
  onEdit: () => void;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/**
 * Read-only crew member detail sheet. Tapping a crew member opens this view
 * (not the editor) so accidental taps can't mutate data. Admins see an Edit
 * button that hands off to the existing CrewMemberForm.
 */
export function CrewMemberDetail({ memberId, onClose, onEdit }: Props) {
  const { data: member, isLoading } = useCrewMember(memberId);
  const { isAdmin } = useOrganization();
  const redCardsEnabled = useRedCardsEnabled();
  const { data: card } = useRedCardByMember(redCardsEnabled ? memberId : null);
  const [zoomed, setZoomed] = useState(false);


  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const photoUrl = (member as any)?.profile_photo_url as string | null | undefined;
  const phone = member?.phone ?? null;
  const notes = (member as any)?.notes as string | null | undefined;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] rounded-t-2xl bg-background animate-in slide-in-from-bottom flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2 shrink-0 border-b border-border">
          <h2 className="text-lg font-bold truncate">Crew Member</h2>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground touch-target"
                aria-label="Edit crew member"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="touch-target p-2"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {isLoading || !member ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-accent shrink-0 border-2 border-primary/10">
                  {photoUrl ? (
                    <SignedImage
                      src={photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-base font-bold text-accent-foreground">
                        {getInitials(member.name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold truncate">{member.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                        member.active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                </div>
              </div>

              {/* Red Card (view-only, tap to expand) — featured at the top */}
              {redCardsEnabled && card && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Red Card
                    </h4>
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Maximize2 className="h-3 w-3" />
                      Tap to expand
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setZoomed(true)}
                    className="block w-full text-left rounded-2xl ring-1 ring-border shadow-md transition-transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Expand Red Card"
                  >
                    <RedCardCard card={card} memberName={member.name} />
                  </button>
                </section>
              )}

              {redCardsEnabled && !card && isAdmin && (
                <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
                  <p className="text-sm font-medium">No Red Card on file.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tap Edit to add one for this member.
                  </p>
                </section>
              )}

              {/* Contact rows */}
              <section className="space-y-1">
                <Row icon={<User className="h-4 w-4" />} label="Role" value={member.role} />
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-3 rounded-xl bg-card p-3 touch-target active:scale-[0.98] transition-transform"
                  >
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Phone
                      </p>
                      <p className="text-sm font-medium text-primary truncate">
                        {formatPhone(phone)}
                      </p>
                    </div>
                  </a>
                ) : (
                  <Row icon={<Phone className="h-4 w-4" />} label="Phone" value="—" muted />
                )}
              </section>

              {/* Notes */}
              {notes && (
                <section className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{notes}</p>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {zoomed && card && member && (
        <RedCardViewer
          card={card}
          memberName={member.name}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={`text-sm font-medium truncate ${muted ? "text-muted-foreground" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
