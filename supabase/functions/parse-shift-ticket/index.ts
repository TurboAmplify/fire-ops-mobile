import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function toDataUrl(fileUrl: string): Promise<{ url: string }> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  const bytes = new Uint8Array(await res.arrayBuffer());
  const b64 = base64Encode(bytes.buffer as ArrayBuffer);
  let mime = contentType.split(";")[0].trim();
  if (!mime || mime === "application/octet-stream") {
    const lower = fileUrl.toLowerCase();
    if (lower.includes(".pdf")) mime = "application/pdf";
    else if (lower.includes(".png")) mime = "image/png";
    else if (lower.includes(".jpg") || lower.includes(".jpeg")) mime = "image/jpeg";
    else if (lower.includes(".webp")) mime = "image/webp";
    else mime = "image/jpeg";
  }
  return { url: `data:${mime};base64,${b64}` };
}

function isAllowedFileUrl(fileUrl: string): boolean {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const allowedHost = new URL(supabaseUrl).host;
    const u = new URL(fileUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.host !== allowedHost) return false;
    return u.pathname.startsWith("/storage/v1/");
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileUrl, fileName } = await req.json();
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAllowedFileUrl(fileUrl)) {
      return new Response(JSON.stringify({ error: "fileUrl must be a Supabase Storage URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dataUrl = await toDataUrl(fileUrl);

    const prompt = `You are parsing a federal OF-297 Emergency Equipment Shift Ticket (or a contractor look-alike) photographed or scanned in the field.

Extract every legible field. Normalize times to 24-hour HH:MM. Normalize dates to YYYY-MM-DD.
If a field is empty, illegible, or not present, return an empty string for that field — never invent data.

Header fields (top of form):
- agreement_number  (Agreement / Contract No.)
- contractor_name   (Contractor / Vendor name)
- resource_order_number
- incident_name
- incident_number
- financial_code    (Financial / Job code, e.g. PN SL4V)
- equipment_make_model  (e.g. "2018 Ford F-550")
- equipment_type    (e.g. "Engine T6", "Water Tender")
- serial_vin_number (Serial / VIN)
- license_id_number (License / ID plate)

Equipment time entries (one per row in the equipment table):
Each row should have: date, start (HH:MM), stop (HH:MM), quantity, type (e.g. "Day", "Hour"), remarks.

Personnel time entries (one per operator row):
Each row should have: date, operator_name, op_start, op_stop, sb_start (standby), sb_stop, remarks.
If the row clearly says "Travel" or "Check-In", set activity_type="travel". Otherwise "work".

Other:
- transport_retained (true/false — usually a checkbox)
- is_first_last (true/false — usually a "First/Last" checkbox)
- miles (number, if present)
- remarks (free-text remarks block at bottom)
- contractor_rep_name
- supervisor_name

Return data via the provided tool. The document file name is: ${fileName ?? "(unknown)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You extract structured data from photographed or scanned OF-297 Emergency Equipment Shift Tickets. Return data using the provided tool only. Never fabricate fields.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: dataUrl },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_shift_ticket",
              description: "Extract OF-297 shift ticket fields from a photo or scan",
              parameters: {
                type: "object",
                properties: {
                  agreement_number: { type: "string" },
                  contractor_name: { type: "string" },
                  resource_order_number: { type: "string" },
                  incident_name: { type: "string" },
                  incident_number: { type: "string" },
                  financial_code: { type: "string" },
                  equipment_make_model: { type: "string" },
                  equipment_type: { type: "string" },
                  serial_vin_number: { type: "string" },
                  license_id_number: { type: "string" },
                  transport_retained: { type: "boolean" },
                  is_first_last: { type: "boolean" },
                  miles: { type: "number" },
                  remarks: { type: "string" },
                  contractor_rep_name: { type: "string" },
                  supervisor_name: { type: "string" },
                  equipment_entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "YYYY-MM-DD" },
                        start: { type: "string", description: "HH:MM 24-hour" },
                        stop: { type: "string", description: "HH:MM 24-hour" },
                        quantity: { type: "string" },
                        type: { type: "string", description: "e.g. Day, Hour" },
                        remarks: { type: "string" },
                      },
                    },
                  },
                  personnel_entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "YYYY-MM-DD" },
                        operator_name: { type: "string" },
                        op_start: { type: "string", description: "HH:MM 24-hour" },
                        op_stop: { type: "string", description: "HH:MM 24-hour" },
                        sb_start: { type: "string", description: "HH:MM 24-hour" },
                        sb_stop: { type: "string", description: "HH:MM 24-hour" },
                        activity_type: { type: "string", enum: ["travel", "work"] },
                        remarks: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_shift_ticket" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to parse shift ticket" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: Record<string, unknown> = {};
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify({ parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-shift-ticket error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
