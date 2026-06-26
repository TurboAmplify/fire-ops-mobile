import { useEffect, useRef, useState } from "react";
import { Loader2, X, Camera, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useUpsertRedCard, useDeleteRedCard, useRedCardByMember } from "@/hooks/useRedCards";
import { uploadRedCardFile, type Qualification, WORK_CAPACITY_OPTIONS, RT130_STATUS_OPTIONS } from "@/services/red-cards";
import { parseRedCardAI } from "@/services/ai-parsing";

interface Props {
  crewMemberId: string;
  memberName: string;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-xl border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring touch-target";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function RedCardEditor({ crewMemberId, memberName, onClose }: Props) {
  const { membership } = useOrganization();
  const { data: existing, isLoading } = useRedCardByMember(crewMemberId);
  const upsert = useUpsertRedCard();
  const del = useDeleteRedCard();
  const photoRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [form, setForm] = useState({
    card_id: "",
    agency: "",
    primary_position: "",
    photo_url: "",
    fitness_test_date: "",
    fitness_test_expiration_date: "",
    rt130_includes_190: false,
    rt130_date: "",
    rt130_expiration_date: "",
    issue_date: "",
    review_expiration_date: "",
    signer_name: "",
    signer_title: "",
    restrictions_notes: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_phone: "",
    return_address: "",
  });
  const [quals, setQuals] = useState<Qualification[]>([]);

  useEffect(() => {
    if (!existing) return;
    setForm({
      card_id: existing.card_id ?? "",
      agency: existing.agency ?? "",
      primary_position: existing.primary_position ?? "",
      photo_url: existing.photo_url ?? "",
      fitness_test_date: existing.fitness_test_date ?? "",
      fitness_test_expiration_date: (existing as any).fitness_test_expiration_date ?? "",
      rt130_includes_190: Boolean((existing as any).rt130_includes_190),
      rt130_date: (existing as any).rt130_date ?? "",
      rt130_expiration_date: (existing as any).rt130_expiration_date ?? "",
      issue_date: existing.issue_date ?? "",
      review_expiration_date: existing.review_expiration_date ?? "",
      signer_name: existing.signer_name ?? "",
      signer_title: existing.signer_title ?? "",
      restrictions_notes: existing.restrictions_notes ?? "",
      emergency_contact_name: existing.emergency_contact_name ?? "",
      emergency_contact_relation: existing.emergency_contact_relation ?? "",
      emergency_contact_phone: existing.emergency_contact_phone ?? "",
      return_address: existing.return_address ?? "",
    });
    setQuals(Array.isArray(existing.qualifications) ? (existing.qualifications as any) : []);
  }, [existing]);

  const orgId = membership?.organizationId;

  const handleScan = async (file: File) => {
    if (!orgId) return;
    setScanning(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const parsed = await parseRedCardAI({ imageDataUrl: dataUrl });
      // upload source file in background (best effort)
      try { await uploadRedCardFile(orgId, crewMemberId, file, "source"); } catch { /* non-fatal */ }
      setForm((f) => ({
        ...f,
        card_id: parsed.card_id ?? f.card_id,
        agency: parsed.agency ?? f.agency,
        primary_position: parsed.primary_position ?? f.primary_position,
        fitness_test_date: parsed.fitness_test_date ?? f.fitness_test_date,
        issue_date: parsed.issue_date ?? f.issue_date,
        review_expiration_date: parsed.review_expiration_date ?? f.review_expiration_date,
        signer_name: parsed.signer_name ?? f.signer_name,
        signer_title: parsed.signer_title ?? f.signer_title,
        restrictions_notes: parsed.restrictions_notes ?? f.restrictions_notes,
        emergency_contact_name: parsed.emergency_contact_name ?? f.emergency_contact_name,
        emergency_contact_relation: parsed.emergency_contact_relation ?? f.emergency_contact_relation,
        emergency_contact_phone: parsed.emergency_contact_phone ?? f.emergency_contact_phone,
        return_address: parsed.return_address ?? f.return_address,
      }));
      if (Array.isArray(parsed.qualifications) && parsed.qualifications.length) {
        setQuals(parsed.qualifications);
      }
      toast.success("Scan complete — review and save");
    } catch (e) {
      toast.error("Couldn't read that image", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setScanning(false);
    }
  };

  const handlePhoto = async (file: File) => {
    if (!orgId) return;
    setPhotoUploading(true);
    try {
      const path = await uploadRedCardFile(orgId, crewMemberId, file, "photo");
      setForm((f) => ({ ...f, photo_url: path }));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error("Photo upload failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    try {
      await upsert.mutateAsync({
        organization_id: orgId,
        crew_member_id: crewMemberId,
        ...form,
        // empty-string dates → null
        fitness_test_date: form.fitness_test_date || null,
        issue_date: form.issue_date || null,
        review_expiration_date: form.review_expiration_date || null,
        qualifications: quals as any,
      });
      toast.success("Red Card saved");
      onClose();
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirm("Delete this Red Card?")) return;
    try {
      await del.mutateAsync(existing.id);
      toast.success("Red Card deleted");
      onClose();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-background animate-in slide-in-from-bottom flex flex-col"
        style={{ maxHeight: "calc(100dvh - 3rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2 shrink-0">
          <h2 className="text-lg font-bold">Red Card — {memberName}</h2>
          <button onClick={onClose} className="touch-target p-1"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            {/* Scan / Photo */}
            <div className="grid grid-cols-2 gap-2">
              <input ref={scanRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = ""; }} />
              <input ref={photoRef} type="file" accept="image/*" capture="user" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }} />
              <button type="button" onClick={() => scanRef.current?.click()} disabled={scanning}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground touch-target disabled:opacity-50">
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Scan Card
              </button>
              <button type="button" onClick={() => photoRef.current?.click()} disabled={photoUploading}
                className="flex items-center justify-center gap-2 rounded-xl border bg-card px-3 py-3 text-sm font-bold touch-target disabled:opacity-50">
                {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Photo
              </button>
            </div>

            <Section title="Identity">
              <Input label="Certifying Entity" value={form.card_id} onChange={(v) => setForm({ ...form, card_id: v })} />
              <Input label="Agency" value={form.agency} onChange={(v) => setForm({ ...form, agency: v })} />
              <Input label="Primary Position" value={form.primary_position} onChange={(v) => setForm({ ...form, primary_position: v })} />
            </Section>

            <Section title="Fitness">
              <Select label="Work Capacity Test" value={form.work_capacity_test} options={WORK_CAPACITY_OPTIONS}
                onChange={(v) => setForm({ ...form, work_capacity_test: v })} />
              <Input label="Fitness Test Date" type="date" value={form.fitness_test_date} onChange={(v) => setForm({ ...form, fitness_test_date: v })} />
              <Select label="RT-130 Refresher" value={form.rt130_refresher_status} options={RT130_STATUS_OPTIONS}
                onChange={(v) => setForm({ ...form, rt130_refresher_status: v })} />
            </Section>

            <Section title="Validity">
              <Input label="Issue Date" type="date" value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} />
              <Input label="Review / Expiration" type="date" value={form.review_expiration_date} onChange={(v) => setForm({ ...form, review_expiration_date: v })} />
            </Section>

            <Section title="Qualifications">
              {quals.map((q, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-1">
                  <input className={inputClass} placeholder="Qualification" value={q.qualification}
                    onChange={(e) => setQuals(quals.map((x, j) => j === i ? { ...x, qualification: e.target.value } : x))} />
                  <input className={inputClass + " w-20"} placeholder="Code" value={q.code}
                    onChange={(e) => setQuals(quals.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} />
                  <input className={inputClass + " w-24"} placeholder="Status" value={q.status}
                    onChange={(e) => setQuals(quals.map((x, j) => j === i ? { ...x, status: e.target.value } : x))} />
                  <button type="button" onClick={() => setQuals(quals.filter((_, j) => j !== i))}
                    className="touch-target px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setQuals([...quals, { qualification: "", code: "", status: "" }])}
                className="flex items-center gap-1 text-sm font-semibold text-primary touch-target">
                <Plus className="h-4 w-4" /> Add qualification
              </button>
            </Section>

            <Section title="Signer">
              <Input label="Signer Name" value={form.signer_name} onChange={(v) => setForm({ ...form, signer_name: v })} />
              <Input label="Signer Title" value={form.signer_title} onChange={(v) => setForm({ ...form, signer_title: v })} />
            </Section>

            <Section title="Emergency / Return">
              <Input label="Emergency Contact" value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
              <Input label="Relation" value={form.emergency_contact_relation} onChange={(v) => setForm({ ...form, emergency_contact_relation: v })} />
              <Input label="Phone" type="tel" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Return Address</label>
                <textarea value={form.return_address} onChange={(e) => setForm({ ...form, return_address: e.target.value })}
                  rows={2} className={inputClass + " min-h-[60px]"} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Restrictions / Notes</label>
                <textarea value={form.restrictions_notes} onChange={(e) => setForm({ ...form, restrictions_notes: e.target.value })}
                  rows={2} className={inputClass + " min-h-[60px]"} />
              </div>
            </Section>

            {existing && (
              <button type="button" onClick={handleDelete}
                className="w-full rounded-xl border border-destructive/40 py-3 text-sm font-bold text-destructive touch-target">
                Delete Red Card
              </button>
            )}
          </div>
        )}

        <div className="shrink-0 px-4 pt-2 pb-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
          <button onClick={handleSave} disabled={upsert.isPending}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground touch-target disabled:opacity-50 flex items-center justify-center gap-2">
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Red Card
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
