import { Shield, Phone, MapPin, Zap } from "lucide-react";
import { SignedImage } from "@/components/ui/SignedImage";
import type { RedCard, Qualification } from "@/services/red-cards";

interface Props {
  card: RedCard;
  memberName: string;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${m}/${day}/${y}`;
}

/**
 * Visual representation of a Red Card (Incident Qualification Card).
 * Two stacked cards: front (identity) + back (qualifications). Mobile-first,
 * uses semantic tokens defined in index.css (--red-card-*).
 */
export function RedCardCard({ card, memberName }: Props) {
  const quals = (Array.isArray(card.qualifications) ? card.qualifications : []) as Qualification[];

  return (
    <div className="space-y-4">
      {/* FRONT */}
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        {/* Header */}
        <header className="flex items-stretch bg-[hsl(var(--red-card-accent))] text-[hsl(var(--red-card-accent-foreground))]">
          <div className="flex-1 px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest leading-none opacity-90">Red Card</p>
            <h3 className="text-sm font-extrabold uppercase leading-tight sm:text-base">
              Incident Qualification Card
            </h3>
          </div>
          <div className="flex items-center px-3 sm:px-4">
            <Zap className="h-5 w-5" />
          </div>
        </header>

        {/* Agency strip */}
        <div className="bg-foreground px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-background sm:px-4">
          {card.agency || "Agency"}
        </div>

        {/* Body */}
        <div className="grid grid-cols-[88px_1fr] gap-3 p-3 sm:grid-cols-[120px_1fr] sm:gap-4 sm:p-4">
          <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
            {card.photo_url ? (
              <SignedImage src={card.photo_url} alt={memberName} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Shield className="h-8 w-8" />
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-y-1.5 text-[12px] sm:text-sm">
            <Field label="Name" value={memberName} />
            <Field label="Card ID" value={card.card_id} />
            <Field label="Primary Position" value={card.primary_position} />
          </dl>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-[hsl(var(--red-card-accent))]/40 sm:mx-4" />

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3 text-[12px] sm:text-sm sm:p-4">
          <Field label="Work Capacity Test" value={card.work_capacity_test} />
          <Field label="Fitness Test Date" value={formatDate(card.fitness_test_date)} />
          <Field label="RT-130 Refresher" value={card.rt130_refresher_status} />
          <Field label="Issue Date" value={formatDate(card.issue_date)} />
          <Field label="Review / Expiration" value={formatDate(card.review_expiration_date)} />
        </dl>

        {(card.signer_name || card.signer_title) && (
          <footer className="border-t border-border px-3 py-2 text-[11px] sm:px-4 sm:text-xs">
            <p className="font-semibold">{card.signer_name}</p>
            {card.signer_title && (
              <p className="text-muted-foreground uppercase tracking-wide">{card.signer_title}</p>
            )}
          </footer>
        )}
      </article>

      {/* BACK */}
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <header className="bg-[hsl(var(--red-card-accent))] px-3 py-2 text-[hsl(var(--red-card-accent-foreground))] sm:px-4 sm:py-3">
          <h3 className="text-center text-sm font-extrabold uppercase tracking-wider sm:text-base">
            Current Incident Qualifications
          </h3>
        </header>
        <div className="bg-foreground px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-background sm:px-4">
          {card.agency || "Agency"}
        </div>

        <div className="p-3 sm:p-4">
          {quals.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No qualifications recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full border-collapse text-[12px] sm:text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold uppercase tracking-wide">Qualification</th>
                    <th className="px-2 py-1.5 text-left font-bold uppercase tracking-wide">Code</th>
                    <th className="px-2 py-1.5 text-left font-bold uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quals.map((q, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">{q.qualification}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px]">{q.code}</td>
                      <td className="px-2 py-1.5">{q.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {card.restrictions_notes && (
            <div className="mt-3 rounded-md bg-muted/50 p-2 text-[12px]">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Restrictions / Notes
              </p>
              <p>{card.restrictions_notes}</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
            {(card.emergency_contact_name || card.emergency_contact_phone) && (
              <div className="flex items-start gap-2 text-[12px]">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Emergency Contact
                  </p>
                  {card.emergency_contact_name && (
                    <p className="font-semibold">
                      {card.emergency_contact_name}
                      {card.emergency_contact_relation && (
                        <span className="font-normal text-muted-foreground">
                          {" "}({card.emergency_contact_relation})
                        </span>
                      )}
                    </p>
                  )}
                  {card.emergency_contact_phone && <p>{card.emergency_contact_phone}</p>}
                </div>
              </div>
            )}

            {card.return_address && (
              <div className="flex items-start gap-2 text-[12px]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    If Found, Return To
                  </p>
                  <p className="whitespace-pre-line">{card.return_address}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
        {label}
      </dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
