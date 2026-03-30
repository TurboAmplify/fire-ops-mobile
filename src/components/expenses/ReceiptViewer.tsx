import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";

export function ReceiptViewer({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Receipt</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border"
      >
        {failed ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 bg-secondary">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Receipt image unavailable</p>
          </div>
        ) : (
          <img
            src={url}
            alt="Receipt"
            className="w-full max-h-64 object-contain bg-secondary"
            onError={() => setFailed(true)}
          />
        )}
        <div className="flex items-center gap-1 p-2 text-xs text-primary font-medium">
          <ExternalLink className="h-3 w-3" />
          View full receipt
        </div>
      </a>
    </div>
  );
}
