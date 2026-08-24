import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Public (no-login) ICS-225 eval form, reached via a texted share link.
 * Only the single eval matching the token is ever exposed.
 */

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 40;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  return list.length > RATE_MAX;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(v: unknown, max = 255): string | null {
  if (v == null) return null;
  const s = String(v)
    // deno-lint-ignore no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
  return s === "" ? null : s;
}

function cleanDate(v: unknown): string | null {
  const s = clean(v, 10);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const COLUMNS = ["hot_line", "mop_up", "camp", "other"];
const FACTORS = [
  "knowledge", "performance", "attitude", "decisions", "initiative",
  "welfare", "equipment", "physical", "safety", "other",
];

function cleanRatings(v: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!v || typeof v !== "object") return out;
  for (const [factor, row] of Object.entries(v as Record<string, unknown>)) {
    if (!FACTORS.includes(factor) || !row || typeof row !== "object") continue;
    const cleanRow: Record<string, number> = {};
    for (const [col, score] of Object.entries(row as Record<string, unknown>)) {
      if (!COLUMNS.includes(col)) continue;
      const n = Number(score);
      if (Number.isInteger(n) && n >= 0 && n <= 3) cleanRow[col] = n;
    }
    if (Object.keys(cleanRow).length > 0) out[factor] = cleanRow;
  }
  return out;
}

const PUBLIC_COLS =
  "id, direction, status, subject_name, subject_home_unit, fire_name, fire_number, fire_location, " +
  "fire_position, assignment_from, assignment_to, acres_burned, fuel_types, work_category, " +
  "work_category_other, ratings, other_factor_label, remarks, rater_name, rater_home_unit, " +
  "rater_position, rater_signature_url, rater_signed_date, employee_signature_url, employee_signed_date, token_expires_at";

async function loadByToken(token: string) {
  const { data, error } = await admin
    .from("personnel_evals")
    .select(PUBLIC_COLS)
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function uploadSig(evalId: string, type: "rater" | "employee", base64: string): Promise<string | null> {
  try {
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    if (bin.length === 0 || bin.length > 2_000_000) return null;
    const path = `evals/${evalId}/${type}-${Date.now()}.png`;
    const { error } = await admin.storage.from("signatures").upload(path, bin, { contentType: "image/png" });
    if (error) return null;
    return admin.storage.from("signatures").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return json({ error: "Too many requests. Try again shortly." }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const action = clean(body.action, 20);
  const token = clean(body.token, 96);
  if (!token || !/^[a-z0-9_-]{16,96}$/i.test(token)) return json({ error: "Invalid link" }, 400);

  const row = await loadByToken(token);
  if (!row) return json({ error: "This eval link is no longer valid." }, 404);
  if (row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now()) {
    return json({ error: "This eval link has expired. Ask for a new one." }, 410);
  }

  if (action === "get") {
    return json({ eval: row });
  }

  if (action === "save" || action === "submit") {
    if (row.status === "complete") return json({ error: "This eval is already complete." }, 409);

    const v = (body.value ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {
      fire_name: clean(v.fire_name),
      fire_number: clean(v.fire_number, 80),
      fire_location: clean(v.fire_location),
      fire_position: clean(v.fire_position, 80),
      assignment_from: cleanDate(v.assignment_from),
      assignment_to: cleanDate(v.assignment_to),
      acres_burned: clean(v.acres_burned, 40),
      fuel_types: clean(v.fuel_types, 120),
      work_category: COLUMNS.includes(String(v.work_category)) ? String(v.work_category) : "hot_line",
      work_category_other: clean(v.work_category_other, 80),
      ratings: cleanRatings(v.ratings),
      other_factor_label: clean(v.other_factor_label, 120),
      remarks: clean(v.remarks, 4000),
    };

    // Inbound requests: the outside supervisor is the rater and may edit their
    // own identity + the subject's home unit. The subject's name stays locked.
    if (row.direction === "inbound_request") {
      patch.rater_name = clean(v.rater_name, 120);
      patch.rater_home_unit = clean(v.rater_home_unit);
      patch.rater_position = clean(v.rater_position, 80);
      patch.subject_home_unit = clean(v.subject_home_unit);
    }

    if (action === "save") {
      const { error } = await admin.from("personnel_evals").update(patch).eq("id", row.id);
      if (error) return json({ error: "Could not save. Try again." }, 500);
      return json({ ok: true });
    }

    // submit
    const today = new Date().toISOString().slice(0, 10);
    const raterSig = typeof body.rater_signature_png === "string"
      ? await uploadSig(row.id, "rater", body.rater_signature_png)
      : null;
    const employeeSig = typeof body.employee_signature_png === "string"
      ? await uploadSig(row.id, "employee", body.employee_signature_png)
      : null;

    if (row.direction === "inbound_request") {
      if (!raterSig && !row.rater_signature_url) {
        return json({ error: "A rater signature is required." }, 400);
      }
      if (raterSig) {
        patch.rater_signature_url = raterSig;
        patch.rater_signed_at = new Date().toISOString();
        patch.rater_signed_date = today;
      }
      if (employeeSig) {
        patch.employee_signature_url = employeeSig;
        patch.employee_signed_at = new Date().toISOString();
        patch.employee_signed_date = today;
      }
      const hasEmployee = !!(employeeSig || row.employee_signature_url);
      patch.status = hasEmployee ? "complete" : "awaiting_employee";
    } else {
      // Outward eval: the person rated is acknowledging it.
      if (!employeeSig) return json({ error: "A signature is required." }, 400);
      patch.employee_signature_url = employeeSig;
      patch.employee_signed_at = new Date().toISOString();
      patch.employee_signed_date = today;
      patch.status = "complete";
    }

    patch.submitted_at = new Date().toISOString();

    const { error } = await admin.from("personnel_evals").update(patch).eq("id", row.id);
    if (error) return json({ error: "Could not submit. Try again." }, 500);
    return json({ ok: true, status: patch.status });
  }

  return json({ error: "Unknown action" }, 400);
});
