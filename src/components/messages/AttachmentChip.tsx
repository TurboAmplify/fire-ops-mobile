import { Paperclip, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AttachmentRow } from "@/services/threads";

export function AttachmentChip({ att }: { att: AttachmentRow }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("communication-attachments")
        .createSignedUrl(att.storage_path, 60 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not open");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      toast.error("Could not open attachment");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={open}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-secondary/40 transition-colors max-w-full"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3 shrink-0" />}
      <span className="truncate">{att.file_name}</span>
    </button>
  );
}
