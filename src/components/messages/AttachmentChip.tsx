import { Paperclip, Loader2, Download, MoreVertical, Eye, PenLine, CheckCircle2, Link2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AttachmentRow } from "@/services/threads";
import { useQueryClient } from "@tanstack/react-query";
import { useIncidents } from "@/hooks/useIncidents";
import { useOrganization } from "@/hooks/useOrganization";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

const STAGE_TO_DOC: Record<DocStage, string> = {
  review: "review",
  original: "original",
  finance_signed: "finance_signed",
};

export function AttachmentChip({ att }: { att: AttachmentRow }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { data: incidents } = useIncidents();
  const stage = attachmentStage(att);
  const isPdf = (att.mime_type === "application/pdf") || att.file_name?.toLowerCase().endsWith(".pdf");
  const isAttachable = isPdf && !att.linked_incident_document_id;

  const filteredIncidents = useMemo(() => {
    const list = (incidents ?? []).filter((i: any) => i.status !== "archived");
    if (!filter.trim()) return list.slice(0, 30);
    const q = filter.toLowerCase();
    return list
      .filter((i: any) =>
        (i.name ?? "").toLowerCase().includes(q) ||
        (i.incident_number ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [incidents, filter]);

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
            .update({ stage: STAGE_TO_DOC[next] })
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

  const attachToIncident = async (incidentId: string, incidentOrgId: string) => {
    setSaving(true);
    try {
      // Find the message + thread for context
      const { data: msgRow, error: msgErr } = await supabase
        .from("messages")
        .select("id, thread_id, organization_id")
        .eq("id", att.message_id)
        .maybeSingle();
      if (msgErr || !msgRow) throw msgErr ?? new Error("Message not found");

      const orgId = membership?.organizationId ?? incidentOrgId ?? msgRow.organization_id;

      // Stage: prefer existing AI classification → otherwise default to "needs signature"
      let docStage: string = "original";
      if (att.auto_classified_stage === "of286_finance_signed") docStage = "finance_signed";
      else if (att.auto_classified_stage === "of286_review_only") docStage = "review";

      const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/communication-attachments/${att.storage_path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;

      const { data: doc, error: docErr } = await supabase
        .from("incident_documents")
        .insert({
          incident_id: incidentId,
          organization_id: orgId,
          document_type: "of286",
          file_url: fileUrl,
          file_name: att.file_name,
          stage: docStage,
          source_message_id: msgRow.id,
          thread_id: msgRow.thread_id,
          ai_classification: {
            manual_attach: true,
            auto_classified_as: att.auto_classified_as,
            auto_classified_stage: att.auto_classified_stage,
          },
        })
        .select("id")
        .single();
      if (docErr || !doc) throw docErr ?? new Error("Could not create document");

      // Link attachment ↔ doc; ensure it's flagged as OF-286
      await supabase
        .from("message_attachments")
        .update({
          linked_incident_document_id: doc.id,
          auto_classified_as: "of286",
          auto_classified_stage:
            att.auto_classified_stage ?? "of286_awaiting_signature",
        })
        .eq("id", att.id);

      // Promote thread to the chosen incident if it's not already pinned
      await supabase
        .from("communication_threads")
        .update({ incident_id: incidentId })
        .eq("id", msgRow.thread_id)
        .is("incident_id", null);

      toast.success("Attached to incident");
      setPickerOpen(false);
      qc.invalidateQueries({ queryKey: ["thread"] });
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["incident-documents", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-of286-flags"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Could not attach to incident");
    } finally {
      setSaving(false);
    }
  };

  const pill = stage ? STAGE_PILL[stage] : null;
  const PillIcon = pill?.icon;
  const showMenu = att.auto_classified_as === "of286" || isAttachable;

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
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-secondary/40 text-muted-foreground touch-target"
              aria-label="Attachment actions"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAttachable && (
              <>
                <DropdownMenuItem onClick={() => setPickerOpen(true)}>
                  <Link2 className="h-3.5 w-3.5 mr-2" /> Attach to incident…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {att.auto_classified_as === "of286" && (
              <>
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
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach to incident</DialogTitle>
            <DialogDescription>
              Pick the incident this OF-286 belongs to. It'll show up on that
              incident with the Sign action.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search incidents…"
              className="pl-7"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto -mx-1">
            {filteredIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No incidents found.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredIncidents.map((i: any) => (
                  <li key={i.id}>
                    <button
                      disabled={saving}
                      onClick={() => attachToIncident(i.id, i.organization_id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary/50 disabled:opacity-50 touch-target"
                    >
                      <div className="text-sm font-medium">{i.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {i.incident_number && <span>#{i.incident_number}</span>}
                        <span className="capitalize">{i.status}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
