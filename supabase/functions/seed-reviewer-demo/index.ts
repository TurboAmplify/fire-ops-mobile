// Seeds (or resets) the App Store reviewer demo account.
// Platform-admin gated. Idempotent: re-running deletes prior demo data and recreates it.
//
// POST body (all optional):
//   { email?: string, password?: string, org_name?: string, reset?: boolean }
//
// Defaults:
//   email     = "reviewer@fireopshq.com"
//   password  = "ReviewDemo!2026"
//   org_name  = "Demo Wildland Contractors"
//   reset     = true   (wipes the demo org's data before reseeding)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SeedBody {
  email?: string;
  password?: string;
  org_name?: string;
  reset?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Verify caller is a platform admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin, error: paErr } = await admin.rpc("is_platform_admin", {
      _user_id: user.id,
    });
    if (paErr) return json({ error: paErr.message }, 500);
    if (!isAdmin) return json({ error: "Not authorized (platform admin only)" }, 403);

    // 2. Parse body
    const body: SeedBody = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};
    const email = (body.email ?? "reviewer@fireopshq.com").toLowerCase().trim();
    const password = body.password ?? "ReviewDemo!2026";
    const orgName = body.org_name ?? "Demo Wildland Contractors";
    const reset = body.reset !== false;

    // 3. Find or create the auth user (email-confirmed)
    let userId: string | null = null;

    // listUsers paginates; search by email page-by-page (small instance assumption)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      userId = found.id;
      // Ensure password is set / known
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: "App Store Reviewer" },
      });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "App Store Reviewer" },
      });
      if (cErr) return json({ error: `Create user failed: ${cErr.message}` }, 500);
      userId = created.user!.id;
    }

    // 4. Find an existing demo org for this user (admin role) or create one
    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id, role, organizations!inner(id, name)")
      .eq("user_id", userId);

    let orgId: string | null = null;
    const existingDemo = (memberships ?? []).find(
      // @ts-ignore relational
      (m: any) => m.organizations?.name === orgName,
    );
    if (existingDemo) orgId = existingDemo.organization_id;

    if (!orgId) {
      const { data: newOrg, error: oErr } = await admin
        .from("organizations")
        .insert({
          name: orgName,
          org_type: "contractor",
          accepts_assignments: true,
          operation_type: "engine",
          tier: "free",
          seat_limit: 10,
          billing_status: "active",
          plan_code: "contractor_pro",
        })
        .select("id")
        .single();
      if (oErr) return json({ error: `Create org failed: ${oErr.message}` }, 500);
      orgId = newOrg.id;

      const { error: mErr } = await admin.from("organization_members").insert({
        organization_id: orgId,
        user_id: userId,
        role: "admin",
      });
      if (mErr) return json({ error: `Add member failed: ${mErr.message}` }, 500);
    }

    // 5. Optional: wipe prior demo data (keeps org + admin membership)
    if (reset) {
      const tables = [
        "shift_ticket_audit",
        "shift_tickets",
        "expenses",
        "incident_truck_crew",
        "incident_trucks",
        "incidents",
        "crew_truck_access",
        "trucks",
        "crew_members",
        "crews",
      ];
      for (const t of tables) {
        await admin.from(t).delete().eq("organization_id", orgId);
      }
    }

    // 6. Seed sample data
    // Crew members
    const crewRows = [
      { name: "Alex Reyes", role: "Engine Boss", phone: "555-0101" },
      { name: "Jordan Kim", role: "Firefighter", phone: "555-0102" },
      { name: "Sam Carter", role: "Firefighter", phone: "555-0103" },
    ].map((c) => ({ ...c, organization_id: orgId, active: true, qualifications: [] }));
    const { data: crew } = await admin
      .from("crew_members")
      .insert(crewRows)
      .select("id, name");

    // Trucks
    const truckRows = [
      { name: "E-71", make: "International", model: "7400", year: 2018, unit_type: "Type 6 Engine" },
      { name: "E-72", make: "Ford", model: "F-550", year: 2020, unit_type: "Type 6 Engine" },
    ].map((t) => ({ ...t, organization_id: orgId, status: "available" }));
    const { data: trucks, error: tErr } = await admin
      .from("trucks")
      .insert(truckRows)
      .select("id, name");
    if (tErr) return json({ error: `Trucks insert: ${tErr.message}` }, 500);

    // Grant the demo admin access to both trucks
    if (trucks?.length) {
      await admin.from("crew_truck_access").insert(
        trucks.map((tr) => ({
          organization_id: orgId,
          user_id: userId,
          truck_id: tr.id,
          granted_by: userId,
        })),
      );
    }

    // Incident
    const today = new Date();
    const startDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: incident, error: iErr } = await admin
      .from("incidents")
      .insert({
        organization_id: orgId,
        name: "Ridgeline Fire",
        location: "Deschutes County, OR",
        type: "Wildfire",
        start_date: startDate,
        status: "active",
        acres: 1240,
        containment: 35,
        notes: "Demo incident for App Store review.",
      })
      .select("id")
      .single();
    if (iErr) return json({ error: `Incident insert: ${iErr.message}` }, 500);

    // Assign first truck to the incident
    let incidentTruckId: string | null = null;
    if (trucks?.[0]) {
      const { data: it, error: itErr } = await admin
        .from("incident_trucks")
        .insert({
          incident_id: incident.id,
          truck_id: trucks[0].id,
          status: "assigned",
        })
        .select("id")
        .single();
      if (itErr) return json({ error: `Incident truck: ${itErr.message}` }, 500);
      incidentTruckId = it.id;

      // Assign crew to incident_truck
      if (crew?.length) {
        await admin.from("incident_truck_crew").insert(
          crew.map((c, idx) => ({
            incident_truck_id: incidentTruckId,
            crew_member_id: c.id,
            role_on_assignment: idx === 0 ? "Engine Boss" : "Firefighter",
            is_active: true,
          })),
        );
      }
    }

    // Sample expenses (one approved, one submitted, one draft)
    await admin.from("expenses").insert([
      {
        organization_id: orgId,
        incident_id: incident.id,
        incident_truck_id: incidentTruckId,
        date: startDate,
        amount: 184.32,
        category: "fuel",
        vendor: "Pilot Travel Center",
        fuel_type: "diesel",
        description: "Diesel fill-up en route to incident",
        status: "approved",
        expense_type: "company",
        submitted_by_user_id: userId,
      },
      {
        organization_id: orgId,
        incident_id: incident.id,
        incident_truck_id: incidentTruckId,
        date: startDate,
        amount: 47.5,
        category: "meals",
        vendor: "Sisters Bakery",
        meal_purpose: "Crew breakfast",
        meal_attendees: "3 crew",
        description: "Breakfast",
        status: "submitted",
        expense_type: "reimbursable",
        submitted_by_user_id: userId,
      },
      {
        organization_id: orgId,
        incident_id: incident.id,
        date: today.toISOString().slice(0, 10),
        amount: 22.0,
        category: "supplies",
        vendor: "Ace Hardware",
        description: "Replacement work gloves",
        status: "draft",
        expense_type: "reimbursable",
        submitted_by_user_id: userId,
      },
    ]);

    return json({
      ok: true,
      message: "Reviewer demo account ready",
      credentials: { email, password },
      organization: { id: orgId, name: orgName },
      incident_id: incident.id,
      counts: {
        crew: crew?.length ?? 0,
        trucks: trucks?.length ?? 0,
        expenses: 3,
      },
    });
  } catch (err) {
    console.error("seed-reviewer-demo error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
