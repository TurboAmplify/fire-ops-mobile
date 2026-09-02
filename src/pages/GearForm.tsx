import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DRAFT_KEY = "gear-survey-draft-v1";

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const PANTS_WAISTS = Array.from({ length: 18 }, (_, i) => String(26 + i * 2)); // 26..60
const PANTS_LENGTHS = ["Short", "Regular", "Long"];
const MISMATCH_ITEMS = ["Shirt", "Pants", "Hardhat", "Backpack", "Other"];

type RosterEntry = { id: string; name: string };
type Mismatch = { item: string; size: string; notes: string };

type Draft = {
  crewMemberId: string;
  shirtSize: string;
  shirtCount: string;
  pantsWaist: string;
  pantsLength: string;
  pantsCount: string;
  hasHardhat: string;
  hasBackpack: string;
  mismatches: Mismatch[];
  notes: string;
};

const EMPTY: Draft = {
  crewMemberId: "",
  shirtSize: "",
  shirtCount: "1",
  pantsWaist: "",
  pantsLength: "Regular",
  pantsCount: "1",
  hasHardhat: "",
  hasBackpack: "",
  mismatches: [],
  notes: "",
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  return supabase.functions.invoke("gear-survey", { body: { action, ...payload } });
}

const labelCls = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";
const selectCls =
  "h-12 w-full rounded-xl border border-border bg-card px-3 text-base text-foreground";

function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["yes", "no"].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`min-h-12 rounded-xl border text-base font-semibold capitalize transition-colors ${
            value === v
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export default function GearForm() {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [closed, setClosed] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
  }, [draft]);

  const roster = useQuery({
    queryKey: ["gear-survey-roster"],
    queryFn: async () => {
      const { data, error } = await call("roster");
      if (error) throw error;
      if (data?.error === "closed") {
        setClosed(true);
        return [] as RosterEntry[];
      }
      if (data?.error) throw new Error(data.message ?? "Failed to load");
      return (data?.crew ?? []) as RosterEntry[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!draft.crewMemberId) m.push("your name");
    if (!draft.shirtSize) m.push("shirt size");
    if (!draft.pantsWaist) m.push("pants waist size");
    if (!draft.hasHardhat) m.push("hardhat answer");
    if (!draft.hasBackpack) m.push("backpack answer");
    return m;
  }, [draft]);

  const submit = async () => {
    if (missing.length) return;
    setSubmitting(true);
    try {
      const { data, error } = await call("submit", {
        crew_member_id: draft.crewMemberId,
        payload: {
          shirt_size: draft.shirtSize,
          shirt_count: draft.shirtCount,
          pants_waist: draft.pantsWaist,
          pants_length: draft.pantsLength,
          pants_count: draft.pantsCount,
          has_hardhat: draft.hasHardhat,
          has_backpack: draft.hasBackpack,
          mismatches: draft.mismatches,
          notes: draft.notes,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.message ?? "Couldn't submit. Please try again.");
        return;
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone(true);
    } catch {
      toast.error("Couldn't submit. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const addMismatch = () =>
    set("mismatches", [...draft.mismatches, { item: "", size: "", notes: "" }]);
  const updateMismatch = (i: number, patch: Partial<Mismatch>) =>
    set("mismatches", draft.mismatches.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const removeMismatch = (i: number) =>
    set("mismatches", draft.mismatches.filter((_, j) => j !== i));

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" />
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p className="text-muted-foreground">
          Your gear information has been submitted. If anything changes, let Brandon or Dustin know.
        </p>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">Gear Survey</h1>
        <p className="text-muted-foreground">This form is no longer accepting responses.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md p-4 pb-[max(2rem,var(--app-safe-bottom))]">
      <header className="mb-5 pt-4">
        <h1 className="text-2xl font-bold">Dry Lightning Gear Survey</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick check-in so we know what you have and what fits. Takes about a minute.
        </p>
      </header>

      {roster.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : roster.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Couldn't load the form. Check your connection and refresh the page.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Name */}
          <section>
            <label className={labelCls}>Your name</label>
            <select
              className={selectCls}
              value={draft.crewMemberId}
              onChange={(e) => set("crewMemberId", e.target.value)}
            >
              <option value="">Select your name…</option>
              {roster.data!.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Names disappear from this list once submitted.
            </p>
          </section>

          {/* Shirts */}
          <section className="rounded-2xl bg-card p-4 card-shadow space-y-4">
            <h2 className="text-base font-bold">Shirts</h2>
            <div>
              <label className={labelCls}>Shirt size</label>
              <div className="grid grid-cols-4 gap-2">
                {SHIRT_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("shirtSize", s)}
                    className={`min-h-11 rounded-xl border text-sm font-semibold ${
                      draft.shirtSize === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>How many fire shirts do you have?</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={draft.shirtCount}
                onChange={(e) => set("shirtCount", e.target.value)}
                className={selectCls}
              />
            </div>
          </section>

          {/* Pants */}
          <section className="rounded-2xl bg-card p-4 card-shadow space-y-4">
            <h2 className="text-base font-bold">Pants</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Waist</label>
                <select
                  className={selectCls}
                  value={draft.pantsWaist}
                  onChange={(e) => set("pantsWaist", e.target.value)}
                >
                  <option value="">Select…</option>
                  {PANTS_WAISTS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Length</label>
                <select
                  className={selectCls}
                  value={draft.pantsLength}
                  onChange={(e) => set("pantsLength", e.target.value)}
                >
                  {PANTS_LENGTHS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>How many pairs of fire pants do you have?</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={draft.pantsCount}
                onChange={(e) => set("pantsCount", e.target.value)}
                className={selectCls}
              />
            </div>
          </section>

          {/* Hardhat / backpack */}
          <section className="rounded-2xl bg-card p-4 card-shadow space-y-4">
            <div>
              <label className={labelCls}>Do you have a hardhat?</label>
              <YesNo value={draft.hasHardhat} onChange={(v) => set("hasHardhat", v)} />
            </div>
            <div>
              <label className={labelCls}>Do you have a fireline backpack?</label>
              <YesNo value={draft.hasBackpack} onChange={(v) => set("hasBackpack", v)} />
            </div>
          </section>

          {/* Doesn't fit */}
          <section className="rounded-2xl bg-card p-4 card-shadow space-y-3">
            <h2 className="text-base font-bold">Anything that doesn't fit?</h2>
            <p className="text-[12px] text-muted-foreground">
              Add any gear you have that's the wrong size so we can swap it.
            </p>
            {draft.mismatches.map((m, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex gap-2">
                  <select
                    className={`${selectCls} flex-1`}
                    value={m.item}
                    onChange={(e) => updateMismatch(i, { item: e.target.value })}
                  >
                    <option value="">Item…</option>
                    {MISMATCH_ITEMS.map((it) => (
                      <option key={it} value={it}>{it}</option>
                    ))}
                  </select>
                  <input
                    className={`${selectCls} w-24`}
                    placeholder="Size"
                    value={m.size}
                    onChange={(e) => updateMismatch(i, { size: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeMismatch(i)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  className={selectCls}
                  placeholder="Notes (optional)"
                  value={m.notes}
                  onChange={(e) => updateMismatch(i, { notes: e.target.value })}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addMismatch}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-foreground"
            >
              <Plus className="h-4 w-4" /> Add an item
            </button>
          </section>

          {/* Notes */}
          <section>
            <label className={labelCls}>Anything else we should know? (optional)</label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-border bg-card p-3 text-base text-foreground"
              value={draft.notes}
              maxLength={500}
              onChange={(e) => set("notes", e.target.value)}
            />
          </section>

          {missing.length > 0 && draft.crewMemberId && (
            <p className="text-[12px] text-muted-foreground">
              Still needed: {missing.join(", ")}.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || missing.length > 0}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
