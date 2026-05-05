// Marketing site → app webhook. Single endpoint, action-dispatched.
// All requests must be HMAC-signed (see _shared/hmac.ts).
//
// Actions:
//   provision-org       Create user + org after Stripe checkout completes
//   update-org-billing  Update plan/status (e.g. plan change)
//   suspend-org         Mark org status='suspended' (payment failed)
//   reactivate-org      Mark org status='active'
//   close-org           Mark org status='closed' (cancellation, soft only)
//
// Stripe webhooks fire on the marketing site → marketing site signs &
// forwards here. The iOS app never sees Stripe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyHmac, corsHeaders, jsonResponse } from "../_shared/hmac.ts";

const APP_REVIEW_PROTECTED = (org: { plan_code?: string | null }) =>
  org?.plan_code === "app_review";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const verify = await verifyHmac(req);
  if (!verify.ok) return jsonResponse({ error: verify.error }, verify.status ?? 401);

  let payload: any;
  try {
    payload = JSON.parse(verify.body ?? "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const action = String(payload.action ?? "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const audit = async (act: string, target_id: string | null, payloadJson: any) => {
    await supabase.from("platform_admin_audit").insert({
      actor_user_id: null,
      action: `marketing_site:${act}`,
      target_type: "organization",
      target_id,
      payload: payloadJson,
      reason: "Marketing site webhook",
    });
  };

  try {
    switch (action) {
      case "provision-org": {
        const { email, full_name, org_name, org_type, plan_code, stripe_customer_id, stripe_subscription_id } = payload;
        if (!email || !org_name) return jsonResponse({ error: "email and org_name required" }, 400);

        // 1. Token row (lets the auth.users trigger allow this signup)
        const { data: token, error: tokErr } = await supabase
          .from("provisioning_tokens")
          .insert({
            email: String(email).toLowerCase(),
            org_name,
            org_type: org_type ?? "contractor",
            plan_code: plan_code ?? null,
            stripe_customer_id: stripe_customer_id ?? null,
            stripe_subscription_id: stripe_subscription_id ?? null,
            full_name: full_name ?? null,
          })
          .select()
          .single();
        if (tokErr) throw tokErr;

        // 2. Create the auth user (service role bypasses email confirmation)
        const { data: created, error: userErr } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: full_name ?? null },
        });
        if (userErr) throw userErr;
        const userId = created.user!.id;

        // 3. Create the org
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .insert({
            name: org_name,
            org_type: org_type ?? "contractor",
            plan_code: plan_code ?? null,
            stripe_customer_id: stripe_customer_id ?? null,
            stripe_subscription_id: stripe_subscription_id ?? null,
            provisioned_via: "marketing_site",
            status: "active",
            billing_status: "active",
          })
          .select()
          .single();
        if (orgErr) throw orgErr;

        // 4. Make user the admin owner
        await supabase.from("organization_members").insert({
          organization_id: org.id,
          user_id: userId,
          role: "admin",
        });

        // 5. Mark token consumed
        await supabase
          .from("provisioning_tokens")
          .update({ status: "consumed", consumed_at: new Date().toISOString(), consumed_user_id: userId, consumed_org_id: org.id })
          .eq("id", token.id);

        // 6. Send password-set link
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${Deno.env.get("APP_URL") ?? "https://app.fireopshq.com"}/reset-password` },
        });

        await audit("provision_org", org.id, { email, org_name, plan_code });
        return jsonResponse({
          ok: true,
          organization_id: org.id,
          user_id: userId,
          set_password_url: linkData?.properties?.action_link ?? null,
        });
      }

      case "update-org-billing": {
        const { stripe_customer_id, plan_code, status } = payload;
        if (!stripe_customer_id) return jsonResponse({ error: "stripe_customer_id required" }, 400);
        const updates: any = {};
        if (plan_code !== undefined) updates.plan_code = plan_code;
        if (status && ["active", "suspended", "closed"].includes(status)) updates.status = status;
        const { data, error } = await supabase
          .from("organizations")
          .update(updates)
          .eq("stripe_customer_id", stripe_customer_id)
          .select("id, plan_code")
          .maybeSingle();
        if (error) throw error;
        if (data && APP_REVIEW_PROTECTED(data)) {
          return jsonResponse({ error: "App Review org is protected" }, 403);
        }
        await audit("update_org_billing", data?.id ?? null, updates);
        return jsonResponse({ ok: true });
      }

      case "suspend-org":
      case "reactivate-org":
      case "close-org": {
        const newStatus = action === "suspend-org" ? "suspended" : action === "close-org" ? "closed" : "active";
        const { stripe_customer_id, organization_id } = payload;
        if (!stripe_customer_id && !organization_id) {
          return jsonResponse({ error: "stripe_customer_id or organization_id required" }, 400);
        }
        let q = supabase.from("organizations").update({ status: newStatus }).select("id, plan_code, name").maybeSingle();
        if (organization_id) q = supabase.from("organizations").update({ status: newStatus }).eq("id", organization_id).select("id, plan_code, name").maybeSingle();
        else q = supabase.from("organizations").update({ status: newStatus }).eq("stripe_customer_id", stripe_customer_id).select("id, plan_code, name").maybeSingle();
        const { data, error } = await q;
        if (error) throw error;
        if (data && APP_REVIEW_PROTECTED(data)) {
          return jsonResponse({ error: "App Review org is protected" }, 403);
        }
        await audit(action.replace(/-/g, "_"), data?.id ?? null, { new_status: newStatus });
        return jsonResponse({ ok: true, organization_id: data?.id ?? null });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("marketing-webhook error:", err);
    return jsonResponse({ error: err?.message ?? "Internal error" }, 500);
  }
});
