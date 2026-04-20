import { useState } from "react";
import { parseReceiptAI, type ParsedReceipt } from "@/services/ai-parsing";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  receiptUrl: string;
  onApply: (parsed: ParsedReceipt) => void;
}

export function ReceiptParseButton({ receiptUrl, onApply }: Props) {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedReceipt | null>(null);

  const handleParse = async () => {
    setParsing(true);
    try {
      const parsed = await parseReceiptAI(receiptUrl);
      setResult(parsed);
      toast.success("Receipt analyzed");
    } catch {
      toast.error("Failed to analyze receipt");
    } finally {
      setParsing(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      setResult(null);
    }
  };

  if (result) {
    return (
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-primary flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            AI Suggestions
          </p>
          <button onClick={() => setResult(null)} className="touch-target p-1">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {result.amount != null && (
            <div>
              <span className="text-muted-foreground">Amount: </span>
              <span className="font-medium">${result.amount}</span>
            </div>
          )}
          {result.date && (
            <div>
              <span className="text-muted-foreground">Date: </span>
              <span className="font-medium">{result.date}</span>
            </div>
          )}
          {result.category && (
            <div>
              <span className="text-muted-foreground">Category: </span>
              <span className="font-medium">{result.category}</span>
            </div>
          )}
          {result.description && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Description: </span>
              <span className="font-medium">{result.description}</span>
            </div>
          )}
          {result.vendor && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Vendor: </span>
              <span className="font-medium">{result.vendor}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleApply}
          className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground touch-target flex items-center justify-center gap-1"
        >
          <Check className="h-4 w-4" />
          Apply Suggestions
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleParse}
      disabled={parsing}
      className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary touch-target w-full justify-center"
    >
      {parsing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading receipt...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Auto-fill from receipt
        </>
      )}
    </button>
  );
}
