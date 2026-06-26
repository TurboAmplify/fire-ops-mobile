// One-off admin utility to look up an auth user by id or email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, email } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let user: any = null;
    if (user_id) {
      const { data, error } = await supabase.auth.admin.getUserById(user_id);
      if (error) throw error;
      user = data.user;
    } else if (email) {
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      user = data.users.find((u) => (u.email ?? "").toLowerCase() === String(email).toLowerCase()) ?? null;
    }
    if (!user) return new Response(JSON.stringify({ ok: false, user: null }), { headers: corsHeaders });
    return new Response(JSON.stringify({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        banned_until: (user as any).banned_until,
        created_at: user.created_at,
      },
    }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
