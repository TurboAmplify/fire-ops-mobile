import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Temporary IBPA training data collection — Dry Lightning only.
const ORG_ID = "2ffa93de-506d-4aa7-a53e-a3a04d9626be";
const EXCLUDED_NAMES = ["brandon aldrich", "justin richardson"];

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isExcluded(name: string) {
  return EXCLUDED_NAMES.includes(name.trim().toLowerCase());
}

function clean(v: unknown, max = 255): string {
  if (v == null) return "";
  return String(v)
    // deno-lint-ignore no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
}

function cleanDate(v: unknown): string | null {
  const s = clean(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function cleanEnum(v: unknown, allowed: string[]): string | null {
  const s = clean(v, 40);
  return allowed.includes(s) ? s : null;
}

function cleanStrArray(v: unknown, allowed?: string[]): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v.slice(0, 20)) {
    const s = clean(item, 60);
    if (!s) continue;
    if (allowed && !allowed.includes(s)) continue;
    out.push(s);
  }
  return out;
}

async function collectionOpen(): Promise<boolean> {
  const { data } = await admin
    .from("ibpa_collection_settings")
    .select("is_open")
    .eq("organization_id", ORG_ID)
    .maybeSingle();
  if (!data) return true; // default open until an admin closes it
  return !!data.is_open;
}

/** Eligible = active, not excluded, no response yet. Returns only name + recorded role. */
async function eligibleRoster() {
  const { data: crew, error } = await admin
    .from("crew_members")
    .select("id, name, role")
    .eq("organization_id", ORG_ID)
    .eq("active", true)
    .order("name");
  if (error) throw error;

  const { data: done } = await admin
    .from("ibpa_training_responses")
    .select("crew_member_id")
    .eq("organization_id", ORG_ID);
  const doneIds = new Set((done ?? []).map((r) => r.crew_member_id));

  return (crew ?? [])
    .filter((c) => !isExcluded(c.name) && !doneIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, recorded_role: c.role }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action, 20);

    if (!(await collectionOpen())) {
      return json({ error: "closed", message: "This form is no longer accepting responses." }, 403);
    }

    if (action === "roster") {
      return json({ crew: await eligibleRoster() });
    }

    if (action === "detail") {
      const id = clean(body?.crew_member_id, 40);
      const roster = await eligibleRoster();
      const match = roster.find((r) => r.id === id);
      if (!match) return json({ error: "not_eligible" }, 404);

      // Recorded qualifications summary from the red card (read-only).
      const { data: rc } = await admin
        .from("red_cards")
        .select("primary_position, qualifications, work_capacity_test")
        .eq("crew_member_id", id)
        .maybeSingle();

      let quals: string[] = [];
      if (rc?.qualifications) {
        const q = rc.qualifications as unknown;
        if (Array.isArray(q)) {
          quals = q
            .map((x) => (typeof x === "string" ? x : (x as Record<string, unknown>)?.name))
            .filter(Boolean)
            .map((x) => String(x));
        }
      }

      return json({
        id: match.id,
        name: match.name,
        recorded_role: match.recorded_role,
        recorded_position: rc?.primary_position ?? null,
        recorded_qualifications: quals,
        recorded_wct: rc?.work_capacity_test ?? null,
      });
    }

    if (action === "submit") {
      // Best-effort throttle (no platform rate-limit primitive available).
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      const { count } = await admin
        .from("ibpa_submit_log")
        .select("id", { count: "exact", head: true })
        .eq("client_key", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= RATE_MAX) {
        return json({ error: "rate_limited", message: "Too many submissions. Try again later." }, 429);
      }
      await admin.from("ibpa_submit_log").insert({ client_key: ip });

      const id = clean(body?.crew_member_id, 40);
      const roster = await eligibleRoster();
      const match = roster.find((r) => r.id === id);
      if (!match) return json({ error: "not_eligible", message: "This person has already submitted the form." }, 409);

      const p = body?.payload ?? {};
      const yn = ["yes", "no", "unknown"];
      const QUALS = ["FFT2", "FFT1", "ENGB", "Faller", "Medical", "Water Handling", "None of these", "I'm not sure"];
      const AGREEMENTS = ["Water Handling", "Faller", "Medical", "None of these", "I'm not sure"];
      const PROVIDERS = ["FEMA", "NWCG", "Another provider", "I don't know"];

      const identity = {
        first_name: clean(p?.identity?.first_name, 60),
        middle_name: clean(p?.identity?.middle_name, 60),
        no_middle_name: !!p?.identity?.no_middle_name,
        last_name: clean(p?.identity?.last_name, 60),
        email: clean(p?.identity?.email, 255).toLowerCase(),
        phone: clean(p?.identity?.phone, 20),
        prior_ibpa: cleanEnum(p?.identity?.prior_ibpa, yn),
        verification_id: clean(p?.identity?.verification_id, 60),
        verification_id_unknown: !!p?.identity?.verification_id_unknown,
        legal_name_confirmed: !!p?.identity?.legal_name_confirmed,
      };
      if (!identity.first_name || !identity.last_name) {
        return json({ error: "invalid", message: "Legal first and last name are required." }, 400);
      }

      const roleConfirmation = {
        answer: cleanEnum(p?.role_confirmation?.answer, ["yes", "no", "unsure"]),
        corrected: cleanStrArray(p?.role_confirmation?.corrected, QUALS),
      };

      const courseKeys = [
        "rt130", "wct", "s130", "s190", "ics100", "is700a", "l180",
        "s131_133", "fft1_taskbook", "ics200", "s230", "s290", "engb_taskbook",
      ];
      const courses: Record<string, unknown> = {};
      for (const k of courseKeys) {
        const c = p?.courses?.[k] ?? {};
        courses[k] = {
          date: cleanDate(c?.date),
          unknown: !!c?.unknown,
          online: cleanEnum(c?.online, yn),
          provider: cleanEnum(c?.provider, PROVIDERS),
          provider_other: clean(c?.provider_other, 120),
        };
      }
      courses["wct_arduous"] = cleanEnum(p?.courses?.wct_arduous, ["yes", "no", "unsure"]);

      const unknownFields = cleanStrArray(p?.unknown_fields);
      const needsReview =
        roleConfirmation.answer === "no" ||
        roleConfirmation.answer === "unsure" ||
        roleConfirmation.corrected.includes("I'm not sure");

      const { error: insErr } = await admin.from("ibpa_training_responses").insert({
        organization_id: ORG_ID,
        crew_member_id: id,
        crew_member_name: match.name,
        recorded_role: match.recorded_role,
        recorded_qualifications: clean(p?.recorded_summary, 500)
          ? { summary: clean(p?.recorded_summary, 500) }
          : {},
        identity,
        role_confirmation: roleConfirmation,
        agreement_categories: cleanStrArray(p?.agreement_categories, AGREEMENTS),
        courses,
        unknown_fields: unknownFields,
        needs_review: needsReview,
      });

      if (insErr) {
        if ((insErr as { code?: string }).code === "23505") {
          return json({ error: "duplicate", message: "This person has already submitted the form." }, 409);
        }
        throw insErr;
      }

      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("ibpa-training error", e);
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});
