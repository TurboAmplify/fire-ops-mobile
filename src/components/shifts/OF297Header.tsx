import { FileText } from "lucide-react";

interface OF297HeaderProps {
  agreementNumber?: string | null;
  contractorName?: string | null;
  resourceOrderNumber?: string | null;
  incidentName?: string | null;
  incidentNumber?: string | null;
  financialCode?: string | null;
  equipmentMakeModel?: string | null;
  equipmentType?: string | null;
  vinNumber?: string | null;
  licensePlate?: string | null;
}

export function OF297Header({
  agreementNumber,
  contractorName,
  resourceOrderNumber,
  incidentName,
  incidentNumber,
  financialCode,
  equipmentMakeModel,
  equipmentType,
  vinNumber,
  licensePlate,
}: OF297HeaderProps) {
  const fields = [
    { label: "1. Agreement #", value: agreementNumber },
    { label: "2. Contractor", value: contractorName },
    { label: "3. Resource Order #", value: resourceOrderNumber },
    { label: "4. Incident Name", value: incidentName },
    { label: "5. Incident #", value: incidentNumber },
    { label: "6. Financial Code", value: financialCode },
    { label: "7. Equipment", value: equipmentMakeModel },
    { label: "8. Equipment Type", value: equipmentType },
    { label: "9. VIN", value: vinNumber },
    { label: "10. License/ID", value: licensePlate },
  ];

  const hasAnyData = fields.some((f) => f.value);

  if (!hasAnyData) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <FileText className="h-3.5 w-3.5" />
        OF-297 Shift Ticket Info
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-tight">{f.label}</p>
            <p className="text-xs font-medium truncate">{f.value || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
