import { useState } from "react";
import { useResourceOrders, useCreateResourceOrder, useUpdateResourceOrderParsed } from "@/hooks/useResourceOrders";
import { uploadResourceOrderFile, parseResourceOrderAI } from "@/services/resource-orders";
import { FileText, Upload, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface Props {
  incidentTruckId: string;
}

export function ResourceOrderSection({ incidentTruckId }: Props) {
  const { membership } = useOrganization();
  const { data: orders, isLoading } = useResourceOrders(incidentTruckId);
  const createMutation = useCreateResourceOrder(incidentTruckId);
  const parseMutation = useUpdateResourceOrderParsed(incidentTruckId);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileUrl = await uploadResourceOrderFile(file, membership?.organizationId);
      const order = await createMutation.mutateAsync({
        incident_truck_id: incidentTruckId,
        file_url: fileUrl,
        file_name: file.name,
      });
      toast.success("Resource order uploaded");

      // Auto-parse with AI
      setParsing(order.id);
      try {
        const parsed = await parseResourceOrderAI(fileUrl, file.name);
        await parseMutation.mutateAsync({ id: order.id, parsed });
        toast.success("Resource order parsed successfully");
      } catch {
        toast.error("AI parsing failed — you can retry later");
      } finally {
        setParsing(null);
      }
    } catch {
      toast.error("Failed to upload resource order");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRetryParse = async (order: any) => {
    setParsing(order.id);
    try {
      const parsed = await parseResourceOrderAI(order.file_url, order.file_name);
      await parseMutation.mutateAsync({ id: order.id, parsed });
      toast.success("Parsed successfully");
    } catch {
      toast.error("Parsing failed");
    } finally {
      setParsing(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resource Orders</p>
        <label className="flex items-center gap-1 text-xs font-medium text-primary cursor-pointer touch-target">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{uploading ? "Uploading..." : "Upload"}</span>
          <input type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}

      {!isLoading && (!orders || orders.length === 0) && (
        <p className="text-xs text-muted-foreground">No resource orders uploaded.</p>
      )}

      {orders?.map((order) => {
        const isExpanded = expandedOrder === order.id;
        const isParsing = parsing === order.id;
        const hasParsed = order.parsed_at != null;
        const parsed = order.parsed_data || {};

        return (
          <div key={order.id} className="rounded-lg bg-secondary/50 overflow-hidden">
            <button
              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              className="flex w-full items-center justify-between p-3 text-left touch-target"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.file_name}</p>
                  {order.agreement_number && (
                    <p className="text-xs text-primary font-semibold">Agreement: {order.agreement_number}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isParsing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {hasParsed && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-2 space-y-2">
                {!hasParsed && !isParsing && (
                  <button
                    onClick={() => handleRetryParse(order)}
                    className="flex items-center gap-1 text-xs font-medium text-primary touch-target"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Parse with AI
                  </button>
                )}

                {isParsing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Parsing document...
                  </p>
                )}

                {hasParsed && <ParsedDataDisplay data={parsed} />}

                <a
                  href={order.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-primary underline touch-target"
                >
                  View original document
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ParsedDataDisplay({ data }: { data: Record<string, any> }) {
  const displayFields = [
    { key: "agreement_number", label: "Agreement #" },
    { key: "resource_order_number", label: "Resource Order #" },
    { key: "ordering_unit", label: "Ordering Unit" },
    { key: "incident_name", label: "Incident" },
    { key: "incident_number", label: "Incident #" },
    { key: "resource_type", label: "Resource Type" },
    { key: "resource_name", label: "Resource Name" },
    { key: "reporting_location", label: "Report To" },
    { key: "reporting_date", label: "Report Date" },
    { key: "demob_date", label: "Demob Date" },
    { key: "operational_period", label: "Op Period" },
    { key: "shift_start_time", label: "Shift Start" },
    { key: "shift_end_time", label: "Shift End" },
    { key: "special_instructions", label: "Instructions" },
  ];

  const hasData = displayFields.some((f) => data[f.key]);

  if (!hasData) {
    return <p className="text-xs text-muted-foreground">No data could be extracted.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-1">
      {displayFields
        .filter((f) => data[f.key])
        .map((f) => (
          <div key={f.key} className="text-xs">
            <span className="text-muted-foreground">{f.label}: </span>
            <span className="font-medium">{data[f.key]}</span>
          </div>
        ))}
    </div>
  );
}
