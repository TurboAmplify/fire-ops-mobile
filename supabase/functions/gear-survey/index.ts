import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Temporary gear/PPE survey collection — Dry Lightning only.
const ORG_ID = "2ffa93de-506d-4aa7-a53e-a3a04d9626be";

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

function clean(v: unknown, max = 255): string {
  if (v == null) return "";
  return String(v)
    // deno-lint-ignore no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
}

function cleanEnum(v: unknown, allowed: string[]): string | null {
  const s = clean(v, 40);
  return allowed.includes(s) ? s : null;
}

async function collectionOpen(): Promise<boolean> {
  const { data } = await admin
    .from("gear_survey_settings")
    .select("is_open")
    .eq("organization_id", ORG_ID)
    .maybeSingle();
  if (!data) return true;
  return !!data.is_open;
}

/** Active crew who haven't submitted yet. Returns only id + name. */
async function eligibleRoster() {
  const { data: crew, error } = await admin
    .from("crew_members")
    .select("id, name")
    .eq("organization_id", ORG_ID)
    .eq("active", true)
    .order("name");
  if (error) throw error;

  const { data: done } = await admin
    .from("gear_survey_responses")
    .select("crew_member_id")
    .eq("organization_id", ORG_ID);
  const doneIds = new Set((done ?? []).map((r) => r.crew_member_id));

  return (crew ?? [])
    .filter((c) => !doneIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));
}

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const PANTS_LENGTHS = ["Short", "Regular", "Long"];
const YES_NO = ["yes", "no"];
const MISMATCH_ITEMS = ["Shirt", "Pants", "Hardhat", "Backpack", "Other"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action, 20);

    if (action === "roster") {
      if (!(await collectionOpen())) {
        return json({ error: "closed", message: "This form is no longer accepting responses." }, 403);
      }
      return json({ crew: await eligibleRoster() });
    }

    if (action === "submit") {
      if (!(await collectionOpen())) {
        return json({ error: "closed", message: "This form is no longer accepting responses." }, 403);
      }

      const id = clean(body?.crew_member_id, 40);
      const roster = await eligibleRoster();
      const match = roster.find((r) => r.id === id);
      if (!match) {
        return json({ error: "not_eligible", message: "This person has already submitted the form." }, 409);
      }

      const p = body?.payload ?? {};

      const payload = {
        shirt_size: cleanEnum(p?.shirt_size, SHIRT_SIZES),
        shirt_count: Math.max(0, Math.min(50, Number.parseInt(clean(p?.shirt_count, 3), 10) || 0)),
        pants_waist: clean(p?.pants_waist, 10),
        pants_length: cleanEnum(p?.pants_length, PANTS_LENGTHS),
        pants_count: Math.max(0, Math.min(50, Number.parseInt(clean(p?.pants_count, 3), 10) || 0)),
        has_hardhat: cleanEnum(p?.has_hardhat, YES_NO),
        has_backpack: cleanEnum(p?.has_backpack, YES_NO),
        mismatches: Array.isArray(p?.mismatches)
          ? p.mismatches.slice(0, 10).map((m: unknown) => {
              const mm = (m ?? {}) as Record<string, unknown>;
              return {
                item: cleanEnum(mm?.item, MISMATCH_ITEMS),
                size: clean(mm?.size, 40),
                notes: clean(mm?.notes, 200),
              };
            }).filter((m: { item: string | null; size: string }) => m.item || m.size)
          : [],
        notes: clean(p?.notes, 500),
      };

      if (!payload.shirt_size || !payload.pants_waist || !payload.has_hardhat || !payload.has_backpack) {
        return json({ error: "invalid", message: "Shirt size, pants size, hardhat and backpack answers are required." }, 400);
      }

      const { error: insErr } = await admin.from("gear_survey_responses").insert({
        organization_id: ORG_ID,
        crew_member_id: id,
        crew_member_name: match.name,
        payload,
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
    console.error("gear-survey error", e);
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});
