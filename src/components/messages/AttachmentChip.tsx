import { Paperclip, Loader2, Download, MoreVertical, Eye, PenLine, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AttachmentRow } from "@/services/threads";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DocStage = "review" | "original" | "finance_signed";

const STAGE_PILL: Record<DocStage, { label: string; icon: typeof Eye; className: string }> = {
  review: {
    label: "Review only",
    icon: Eye,
    className: "bg-secondary/60 text-muted-foreground",
  },
  original: {
    label: "Needs signature",
    icon: PenLine,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  finance_signed: {
    label: "Final signed",
    icon: CheckCircle2,
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
};

function attachmentStage(att: AttachmentRow): DocStage | null {
  if (att.auto_classified_as !== "of286" && !att.linked_incident_document_id) return null;
  switch (att.auto_classified_stage) {
    case "of286_finance_signed":
      return "finance_signed";
    case "of286_awaiting_signature":
      return "original";
    case "of286_review_only":
      return "review";
    default:
      return att.auto_classified_as === "of286" ? "review" : null;
  }
}

export function AttachmentChip({
  att,
  thread,
}: {
  att: AttachmentRow;
  thread?: Pick<ThreadRow, "incident_id" | "incident_truck_id" | "organization_id"> | null;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const stage = attachmentStage(att);
  const isPdf =
    (att.mime_type ?? "").toLowerCase().includes("pdf") ||
    att.file_name?.toLowerCase().endsWith(".pdf");
  const canRestoreShiftTicket =
    isPdf && !!thread?.incident_truck_id && !!thread?.organization_id;

  const restoreAsShiftTicket = async () => {
    if (!thread?.incident_truck_id || !thread?.organization_id) return;
    setRestoring(true);
    try {
      const ticket = await recoverShiftTicketFromPdfAttachment({
        storagePath: att.storage_path,
        fileName: att.file_name,
        incidentTruckId: thread.incident_truck_id,
        organizationId: thread.organization_id,
      });
      toast.success("Draft shift ticket created — review and re-sign.");
      qc.invalidateQueries({ queryKey: ["shift-tickets", thread.incident_truck_id] });
      qc.invalidateQueries({ queryKey: ["shift-tickets-recent"] });
      navigate(`/incidents/${thread.incident_id}/trucks/${thread.incident_truck_id}/shift-ticket/${ticket.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not restore shift ticket");
    } finally {
      setRestoring(false);
    }
  };

  const download = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("communication-attachments")
        .createSignedUrl(att.storage_path, 60 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not open");

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

  const reclassify = async (next: DocStage | "not_of286") => {
    setSaving(true);
    try {
      const stageMap: Record<DocStage, string> = {
        review: "of286_review_only",
        original: "of286_awaiting_signature",
        finance_signed: "of286_finance_signed",
      };
      if (next === "not_of286") {
        await supabase
          .from("message_attachments")
          .update({ auto_classified_as: "other", auto_classified_stage: null })
          .eq("id", att.id);
        if (att.linked_incident_document_id) {
          await supabase
            .from("incident_documents")
            .delete()
            .eq("id", att.linked_incident_document_id);
        }
      } else {
        await supabase
          .from("message_attachments")
          .update({
            auto_classified_as: "of286",
            auto_classified_stage: stageMap[next],
          })
          .eq("id", att.id);
        if (att.linked_incident_document_id) {
          await supabase
            .from("incident_documents")
            .update({ stage: next })
            .eq("id", att.linked_incident_document_id);
        }
      }
      toast.success("Updated classification");
      qc.invalidateQueries({ queryKey: ["thread"] });
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    } catch (e) {
      console.error(e);
      toast.error("Could not update classification");
    } finally {
      setSaving(false);
    }
  };

  const pill = stage ? STAGE_PILL[stage] : null;
  const PillIcon = pill?.icon;

  return (
    <div className="inline-flex items-center gap-1 max-w-full">
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
      {pill && PillIcon && (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${pill.className}`}
        >
          <PillIcon className="h-3 w-3" />
          {pill.label}
        </span>
      )}
      {canRestoreShiftTicket && (
        <button
          onClick={restoreAsShiftTicket}
          disabled={restoring}
          title="Recreate a draft shift ticket from this PDF"
          className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary touch-target disabled:opacity-50"
        >
          {restoring ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FilePlus2 className="h-3 w-3" />
          )}
          Restore as shift ticket
        </button>
      )}
      {att.auto_classified_as === "of286" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-secondary/40 text-muted-foreground touch-target"
              aria-label="Change classification"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Change classification</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => reclassify("review")}>
              <Eye className="h-3.5 w-3.5 mr-2" /> Review only (draft)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => reclassify("original")}>
              <PenLine className="h-3.5 w-3.5 mr-2" /> Needs signature
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => reclassify("finance_signed")}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Final signed (from FO)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => reclassify("not_of286")} className="text-destructive">
              Not an OF-286
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
