import { Paperclip, Loader2, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AttachmentRow } from "@/services/threads";

export function AttachmentChip({ att }: { att: AttachmentRow }) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("communication-attachments")
        .createSignedUrl(att.storage_path, 60 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not open");

      // Fetch as blob so we can trigger a real download (works in iOS/Android
      // webviews where window.open(_blank) is silently blocked).
      const resp = await fetch(data.signedUrl);
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = att.file_name || "attachment";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (e) {
      console.error(e);
      toast.error("Could not open attachment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-secondary/40 transition-colors max-w-full text-foreground"
      title={`Download ${att.file_name}`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <Paperclip className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{att.file_name}</span>
      <Download className="h-3 w-3 shrink-0 opacity-60" />
    </button>
  );
}
