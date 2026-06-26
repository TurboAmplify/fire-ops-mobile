// One-off admin utility: create (or update) an auth user with a known
// email + password and auto-confirm them. The DB handle_new_user trigger
// will attach any pending invite for that email to the right organization.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, password, full_name } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "email and password required" }), { status: 400, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check existence first (admin updates bypass HIBP; admin creates do not in some configs)
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === String(email).toLowerCase());

    if (existing) {
      const { data: updated, error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: full_name ? { ...(existing.user_metadata ?? {}), full_name, name: full_name } : existing.user_metadata,
      });
      if (updErr) throw updErr;
      return new Response(JSON.stringify({ ok: true, mode: "updated", user: { id: updated.user?.id, email: updated.user?.email } }), { headers: corsHeaders });
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name, name: full_name } : undefined,
    });
    if (createErr) throw createErr;
    return new Response(JSON.stringify({ ok: true, mode: "created", user: { id: created.user?.id, email: created.user?.email } }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
