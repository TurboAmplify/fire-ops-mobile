interface Props {
  attendees: string;
  onAttendeesChange: (v: string) => void;
  purpose: string;
  onPurposeChange: (v: string) => void;
}

export function MealComplianceFields({ attendees, onAttendeesChange, purpose, onPurposeChange }: Props) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      <p className="text-sm font-semibold text-primary">🍽️ Meal Compliance (Required)</p>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Attendees *</label>
        <input
          type="text"
          value={attendees}
          onChange={(e) => onAttendeesChange(e.target.value)}
          placeholder="e.g. Engine crew, John & Maria"
          className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Purpose (optional)</label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value)}
          placeholder="e.g. Crew dinner after fire shift"
          className="w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring touch-target"
        />
      </div>
    </div>
  );
}
