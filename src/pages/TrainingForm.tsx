import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AGREEMENT_OPTIONS,
  COURSE_LABELS,
  CourseAnswer,
  IBPA_COMPANY,
  PROVIDER_OPTIONS,
  QUAL_OPTIONS,
  deriveQuals,
  formatPhoneInput,
} from "@/lib/ibpa";

type RosterItem = { id: string; name: string; recorded_role: string | null };
type Detail = RosterItem & {
  recorded_position: string | null;
  recorded_qualifications: string[];
  recorded_wct: string | null;
};

const emptyCourse: CourseAnswer = { date: null, unknown: false, online: null, provider: null, provider_other: "" };

const DRAFT_KEY = "ibpa-training-draft-v1";


function callFn(action: string, payload: Record<string, unknown> = {}) {
  return supabase.functions.invoke("ibpa-training", { body: { action, ...payload } });
}

/* ---------------- small building blocks ---------------- */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function YesNoUnsure({
  label,
  value,
  onChange,
  options = [
    { v: "yes", l: "Yes" },
    { v: "no", l: "No" },
    { v: "unknown", l: "I don't know" },
  ],
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  options?: { v: string; l: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <RadioGroup value={value ?? ""} onValueChange={onChange} className="grid gap-2">
        {options.map((o) => (
          <label
            key={o.v}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4"
          >
            <RadioGroupItem value={o.v} />
            <span className="text-base">{o.l}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function CourseField({
  keyName,
  value,
  onChange,
  askOnline,
}: {
  keyName: string;
  value: CourseAnswer;
  onChange: (v: CourseAnswer) => void;
  askOnline?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <Label className="text-base font-semibold">{COURSE_LABELS[keyName]} completion date</Label>
      <Input
        type="date"
        className="h-12 text-base"
        value={value.date ?? ""}
        disabled={value.unknown}
        onChange={(e) => onChange({ ...value, date: e.target.value || null })}
      />
      <label className="flex min-h-11 items-center gap-3">
        <Checkbox
          checked={value.unknown}
          onCheckedChange={(c) => onChange({ ...value, unknown: !!c, date: c ? null : value.date })}
        />
        <span className="text-sm">I don't know / can't find this date</span>
      </label>

      {askOnline && (
        <div className="space-y-3 border-t border-border pt-3">
          <YesNoUnsure
            label="Was this completed online?"
            value={value.online ?? null}
            onChange={(v) => onChange({ ...value, online: v })}
          />
          {value.online === "yes" && (
            <div className="space-y-2">
              <Label className="text-base">Who provided the online course?</Label>
              <div className="grid gap-2">
                {PROVIDER_OPTIONS.map((p) => (
                  <label
                    key={p}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-4"
                  >
                    <input
                      type="radio"
                      className="h-4 w-4"
                      checked={value.provider === p}
                      onChange={() => onChange({ ...value, provider: p })}
                    />
                    <span className="text-base">{p}</span>
                  </label>
                ))}
              </div>
              {value.provider === "Another provider" && (
                <Input
                  className="h-12 text-base"
                  placeholder="Provider name"
                  value={value.provider_other ?? ""}
                  onChange={(e) => onChange({ ...value, provider_other: e.target.value })}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MultiSelect({
  options,
  values,
  onChange,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4"
        >
          <Checkbox checked={values.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
          <span className="text-base">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function TrainingForm() {
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [identity, setIdentity] = useState({
    first_name: "",
    middle_name: "",
    no_middle_name: false,
    last_name: "",
    email: "",
    phone: "",
    prior_ibpa: null as string | null,
    verification_id: "",
    verification_id_unknown: false,
    legal_name_confirmed: false,
  });
  const [roleAnswer, setRoleAnswer] = useState<string | null>(null);
  const [corrected, setCorrected] = useState<string[]>([]);
  const [agreements, setAgreements] = useState<string[]>([]);
  const [courses, setCourses] = useState<Record<string, CourseAnswer>>({});
  const [wctArduous, setWctArduous] = useState<string | null>(null);
  const [certified, setCertified] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const course = (k: string) => courses[k] ?? emptyCourse;
  const setCourse = (k: string, v: CourseAnswer) => setCourses((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data, error } = await callFn("roster");
      if (error || (data as { error?: string })?.error) {
        if ((data as { error?: string })?.error === "closed") setClosed(true);
        else toast.error("Could not load the crew list. Please try again.");
      } else {
        setRoster((data as { crew: RosterItem[] }).crew ?? []);
      }
      setLoading(false);
    })();
  }, []);

  // Restore an in-progress draft (survives refresh, backgrounding, low signal).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d?.detail) return;
      setDetail(d.detail);
      if (d.identity) setIdentity(d.identity);
      setRoleAnswer(d.roleAnswer ?? null);
      setCorrected(d.corrected ?? []);
      setAgreements(d.agreements ?? []);
      setCourses(d.courses ?? {});
      setWctArduous(d.wctArduous ?? null);
      setStep(typeof d.step === "number" ? d.step : 0);
      setDraftRestored(true);
    } catch {
      /* ignore malformed draft */
    }
  }, []);

  // Autosave on every change.
  useEffect(() => {
    if (!detail || done) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ detail, identity, roleAnswer, corrected, agreements, courses, wctArduous, step }),
      );
    } catch {
      /* storage full or blocked — form still works */
    }
  }, [detail, identity, roleAnswer, corrected, agreements, courses, wctArduous, step, done]);


  const quals = useMemo(
    () => deriveQuals(detail?.recorded_role ?? null, roleAnswer === "yes" ? [] : corrected),
    [detail, roleAnswer, corrected],
  );

  const steps = useMemo(() => {
    const s = ["identity", "role", "agreements", "annual"];
    if (quals.fft2) s.push("fft2");
    if (quals.fft1) s.push("fft1");
    if (quals.engb) s.push("engb");
    s.push("review");
    return s;
  }, [quals]);

  const filtered = roster.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function selectMember(id: string) {
    setLoading(true);
    const { data, error } = await callFn("detail", { crew_member_id: id });
    setLoading(false);
    if (error || (data as { error?: string })?.error) {
      toast.error("That name is no longer available. Please refresh.");
      return;
    }
    const d = data as Detail;
    setDetail(d);
    const parts = d.name.replace(/"[^"]*"/g, " ").split(/\s+/).filter(Boolean);
    setIdentity((i) => ({
      ...i,
      first_name: parts[0] ?? "",
      last_name: parts.length > 1 ? parts[parts.length - 1] : "",
    }));
    setStep(0);
  }

  const recordedSummary = detail
    ? [detail.recorded_role, detail.recorded_position, ...(detail.recorded_qualifications ?? [])]
        .filter(Boolean)
        .join(", ") || "No qualifications on file"
    : "";

  const unknownList = useMemo(() => {
    const out: string[] = [];
    Object.entries(courses).forEach(([k, v]) => {
      if (v.unknown) out.push(COURSE_LABELS[k] ?? k);
    });
    if (identity.verification_id_unknown) out.push("IBPA Verification ID");
    if (identity.prior_ibpa === "unknown") out.push("Previously completed IBPA form");
    if (wctArduous === "unsure") out.push("Whether the WCT was Arduous");
    return out;
  }, [courses, identity, wctArduous]);

  /** Human-readable list of what's still missing on the current step. */
  function missingFor(name: string): string[] {
    const m: string[] = [];
    if (name === "identity") {
      if (!identity.first_name.trim()) m.push("Legal first name");
      if (!identity.no_middle_name && !identity.middle_name.trim())
        m.push('Legal middle name (or check "No middle name")');
      if (!identity.last_name.trim()) m.push("Legal last name");
      if (!/^\S+@\S+\.\S+$/.test(identity.email)) m.push("A valid email address");
      if (!/^\d{3}-\d{3}-\d{4}$/.test(identity.phone)) m.push("A 10-digit phone number");
      if (!identity.prior_ibpa) m.push("Whether you previously completed an IBPA form");
      if (
        identity.prior_ibpa === "yes" &&
        !identity.verification_id.trim() &&
        !identity.verification_id_unknown
      )
        m.push('Verification ID (or check "I don\'t know my Verification ID")');
      if (!identity.legal_name_confirmed) m.push("The legal-name confirmation checkbox");
    }
    if (name === "role") {
      if (!roleAnswer) m.push("Whether our records are correct");
      else if (roleAnswer !== "yes" && corrected.length === 0) m.push("At least one qualification");
    }
    if (name === "agreements" && agreements.length === 0) m.push("At least one agreement category");
    if (name === "review" && !certified) m.push("The certification checkbox");
    return m;
  }

  function canAdvance(name: string) {
    return missingFor(name).length === 0;
  }


  async function submit() {
    if (!detail) return;
    setSubmitting(true);
    const { data, error } = await callFn("submit", {
      crew_member_id: detail.id,
      payload: {
        identity,
        role_confirmation: { answer: roleAnswer, corrected: roleAnswer === "yes" ? [] : corrected },
        agreement_categories: agreements,
        courses: { ...courses, wct_arduous: wctArduous },
        unknown_fields: unknownList,
        recorded_summary: recordedSummary,
      },
    });
    setSubmitting(false);
    const err = error || (data as { error?: string })?.error;
    if (err) {
      toast.error((data as { message?: string })?.message ?? "Could not submit. Please try again.");
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDone(true);

  }

  /* ---------------- render ---------------- */

  if (loading && !detail) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (closed) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-base">This form is no longer accepting responses. Thank you.</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="text-lg font-semibold">Thank you. Your information has been received.</p>
            <p className="text-muted-foreground">You may close this page.</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!detail) {
    return (
      <Shell>
        <Section title="Select your name">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-9 text-base"
              placeholder="Search your name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No names left to complete. If you think this is a mistake, contact Dustin.
              </p>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => selectMember(r.id)}
                className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-card px-4 text-left active:bg-accent"
              >
                <span className="text-base font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.recorded_role}</span>
              </button>
            ))}
          </div>
        </Section>
      </Shell>
    );
  }

  const current = steps[step];

  return (
    <Shell>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {detail.name} · Step {step + 1} of {steps.length}
      </p>

      {draftRestored && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3 text-sm">
          <span>We saved your place — your earlier answers are still here.</span>
          <Button
            variant="ghost"
            className="h-9 shrink-0 px-3"
            onClick={() => {
              try {
                localStorage.removeItem(DRAFT_KEY);
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            Start over
          </Button>
        </div>
      )}


      {current === "identity" && (
        <Section title="Your information" hint="Use your legal name exactly as it appears on your ID.">
          <div className="space-y-3">
            <div>
              <Label className="text-base">Legal first name</Label>
              <Input
                className="h-12 text-base"
                value={identity.first_name}
                onChange={(e) => setIdentity({ ...identity, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-base">Legal middle name</Label>
              <Input
                className="h-12 text-base"
                disabled={identity.no_middle_name}
                value={identity.middle_name}
                onChange={(e) => setIdentity({ ...identity, middle_name: e.target.value })}
              />
              <label className="mt-2 flex min-h-11 items-center gap-3">
                <Checkbox
                  checked={identity.no_middle_name}
                  onCheckedChange={(c) =>
                    setIdentity({ ...identity, no_middle_name: !!c, middle_name: c ? "" : identity.middle_name })
                  }
                />
                <span className="text-sm">No middle name</span>
              </label>
            </div>
            <div>
              <Label className="text-base">Legal last name</Label>
              <Input
                className="h-12 text-base"
                value={identity.last_name}
                onChange={(e) => setIdentity({ ...identity, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-base">Email address</Label>
              <Input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                className="h-12 text-base"
                value={identity.email}
                onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-base">Phone number</Label>
              <Input
                inputMode="tel"
                placeholder="555-123-4567"
                className="h-12 text-base"
                value={identity.phone}
                onChange={(e) => setIdentity({ ...identity, phone: formatPhoneInput(e.target.value) })}
              />
            </div>

            <YesNoUnsure
              label="Have you previously completed an IBPA Training Verification Form?"
              value={identity.prior_ibpa}
              onChange={(v) => setIdentity({ ...identity, prior_ibpa: v })}
            />

            {identity.prior_ibpa === "yes" && (
              <div>
                <Label className="text-base">IBPA Employee Verification ID</Label>
                <Input
                  className="h-12 text-base"
                  disabled={identity.verification_id_unknown}
                  value={identity.verification_id}
                  onChange={(e) => setIdentity({ ...identity, verification_id: e.target.value })}
                />
                <label className="mt-2 flex min-h-11 items-center gap-3">
                  <Checkbox
                    checked={identity.verification_id_unknown}
                    onCheckedChange={(c) =>
                      setIdentity({ ...identity, verification_id_unknown: !!c, verification_id: c ? "" : identity.verification_id })
                    }
                  />
                  <span className="text-sm">I don't know my Verification ID</span>
                </label>
              </div>
            )}

            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-card px-4">
              <Checkbox
                checked={identity.legal_name_confirmed}
                onCheckedChange={(c) => setIdentity({ ...identity, legal_name_confirmed: !!c })}
              />
              <span className="text-sm">My legal name above matches my government-issued identification.</span>
            </label>
          </div>
        </Section>
      )}

      {current === "role" && (
        <Section title="Role and qualifications">
          <div className="rounded-lg border border-border bg-card p-4 text-base">
            Our records list your role/qualifications as: <strong>{recordedSummary}</strong>
          </div>
          <YesNoUnsure
            label="Is this correct?"
            value={roleAnswer}
            onChange={(v) => setRoleAnswer(v)}
            options={[
              { v: "yes", l: "Yes" },
              { v: "no", l: "No" },
              { v: "unsure", l: "I'm not sure" },
            ]}
          />
          {(roleAnswer === "no" || roleAnswer === "unsure") && (
            <div className="space-y-2">
              <Label className="text-base">Select all that apply</Label>
              <MultiSelect options={QUAL_OPTIONS} values={corrected} onChange={setCorrected} />
            </div>
          )}
        </Section>
      )}

      {current === "agreements" && (
        <Section title="Agreement categories" hint="Select every category you expect to work under.">
          <MultiSelect options={AGREEMENT_OPTIONS} values={agreements} onChange={setAgreements} />
        </Section>
      )}

      {current === "annual" && (
        <Section
          title="Annual training"
          hint="If you are brand new, you may enter your S-130 completion date for the refresher requirement."
        >
          <CourseField keyName="rt130" value={course("rt130")} onChange={(v) => setCourse("rt130", v)} />
          <CourseField keyName="wct" value={course("wct")} onChange={(v) => setCourse("wct", v)} />
          <YesNoUnsure
            label="Was this an Arduous Work Capacity Test?"
            value={wctArduous}
            onChange={setWctArduous}
            options={[
              { v: "yes", l: "Yes" },
              { v: "no", l: "No" },
              { v: "unsure", l: "I'm not sure" },
            ]}
          />
        </Section>
      )}

      {current === "fft2" && (
        <Section title="Firefighter Type 2 (FFT2) courses">
          <CourseField keyName="s130" value={course("s130")} onChange={(v) => setCourse("s130", v)} />
          <CourseField keyName="s190" value={course("s190")} onChange={(v) => setCourse("s190", v)} />
          <CourseField keyName="ics100" value={course("ics100")} onChange={(v) => setCourse("ics100", v)} askOnline />
          <CourseField keyName="is700a" value={course("is700a")} onChange={(v) => setCourse("is700a", v)} askOnline />
          <CourseField keyName="l180" value={course("l180")} onChange={(v) => setCourse("l180", v)} />
        </Section>
      )}

      {current === "fft1" && (
        <Section title="Firefighter Type 1 (FFT1) courses">
          <CourseField keyName="s131_133" value={course("s131_133")} onChange={(v) => setCourse("s131_133", v)} />
          <CourseField
            keyName="fft1_taskbook"
            value={course("fft1_taskbook")}
            onChange={(v) => setCourse("fft1_taskbook", v)}
          />
        </Section>
      )}

      {current === "engb" && (
        <Section title="Engine Boss (ENGB) courses">
          <CourseField keyName="ics200" value={course("ics200")} onChange={(v) => setCourse("ics200", v)} askOnline />
          <CourseField keyName="s230" value={course("s230")} onChange={(v) => setCourse("s230", v)} />
          <CourseField keyName="s290" value={course("s290")} onChange={(v) => setCourse("s290", v)} />
          <CourseField
            keyName="engb_taskbook"
            value={course("engb_taskbook")}
            onChange={(v) => setCourse("engb_taskbook", v)}
          />
        </Section>
      )}

      {current === "review" && (
        <Section title="Review your answers">
          <Card>
            <CardContent className="space-y-3 py-4 text-sm">
              <Row label="Name" value={`${identity.first_name} ${identity.middle_name} ${identity.last_name}`.replace(/\s+/g, " ")} />
              <Row label="Email" value={identity.email} />
              <Row label="Phone" value={identity.phone} />
              <Row
                label="Role / qualifications"
                value={roleAnswer === "yes" ? recordedSummary : corrected.join(", ") || "—"}
              />
              <Row label="Agreement categories" value={agreements.join(", ") || "—"} />
              {Object.entries(courses).map(([k, v]) => (
                <Row
                  key={k}
                  label={COURSE_LABELS[k] ?? k}
                  value={v.unknown ? "I don't know" : v.date ?? "—"}
                />
              ))}
              {unknownList.length > 0 && (
                <div className="rounded-md bg-muted p-3">
                  <p className="font-semibold">Marked "I don't know"</p>
                  <p className="text-muted-foreground">{unknownList.join(", ")}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Courses provided by {IBPA_COMPANY.vendor} are recorded automatically with instructor{" "}
                {IBPA_COMPANY.instructor} ({IBPA_COMPANY.phone}).
              </p>
            </CardContent>
          </Card>
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-card px-4">
            <Checkbox checked={certified} onCheckedChange={(c) => setCertified(!!c)} />
            <span className="text-sm">
              I certify that I entered the information to the best of my knowledge and did not guess at any dates.
            </span>
          </label>
        </Section>
      )}

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {showMissing && missingFor(current).length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="font-semibold">Still needed before you can continue:</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {missingFor(current).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              className="h-12 flex-1"
              onClick={() => {
                setShowMissing(false);
                setStep((s) => s - 1);
              }}
            >
              Back
            </Button>
          )}
          {current !== "review" ? (
            <Button
              className="h-12 flex-1"
              onClick={() => {
                if (!canAdvance(current)) {
                  setShowMissing(true);
                  return;
                }
                setShowMissing(false);
                setStep((s) => s + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              className="h-12 flex-1"
              disabled={submitting}
              onClick={() => {
                if (!certified) {
                  setShowMissing(true);
                  return;
                }
                submit();
              }}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit My Training Information
            </Button>
          )}
        </div>
      </div>

    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-lg px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Dry Lightning Training Information</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We need a few details from your training records to complete required company paperwork. Please select your
            name and enter the dates shown on your training certificates or red card. If you cannot find a date, select
            "I don't know" instead of guessing.
          </p>
        </header>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
