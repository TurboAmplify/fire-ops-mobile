import { Mail } from "lucide-react";
import { FinanceContactsSection } from "./FinanceContactsSection";

interface Props {
  incidentId: string;
  organizationId: string;
  incidentRegionId?: string | null;
}

/**
 * Incident-level finance contacts card, rendered on the Overview tab.
 * One or many contacts per incident — used for shift ticket emails and demob.
 */
export function IncidentFinanceContactsCard({ incidentId, organizationId, incidentRegionId }: Props) {
  return (
    <div className="rounded-xl bg-card p-4 card-shadow space-y-3">
      <div className="flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Finance Contacts
        </p>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Who to email shift tickets and demob packets to for this incident.
      </p>
      <FinanceContactsSection
        incidentId={incidentId}
        organizationId={organizationId}
        incidentRegionId={incidentRegionId}
      />
    </div>
  );
}
