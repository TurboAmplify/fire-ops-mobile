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
    if (lower.includes(".png")) mime = "image/png";
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

    const { fileUrl } = await req.json();
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You extract vehicle identification data from photos of trucks, VIN plates, registrations, and license plates for a wildland firefighting fleet management app.

Look carefully for:
- VIN (Vehicle Identification Number, 17 characters, alphanumeric — usually on a metal plate on the dashboard, door jamb, or engine bay)
- License plate number
- Year, make, model (e.g. 2018 Ford F-550)
- Registration expiration date

Determine document type:
- "vin_plate" if the photo shows a VIN sticker/plate
- "registration" if it shows a vehicle registration document
- "license_plate" if it shows just the license plate
- "vehicle" if it shows the truck itself
- "other" if none apply

Only return values you're confident about. Set fields to null when unsure or not visible. Never guess a VIN — partial reads should be null.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract any vehicle identification details from this image." },
              { type: "image_url", image_url: dataUrl },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_truck_details",
              description: "Extract vehicle identification details from a truck-related photo",
              parameters: {
                type: "object",
                properties: {
                  vin: { type: ["string", "null"], description: "17-character VIN, or null if not clearly visible" },
                  license_plate: { type: ["string", "null"], description: "License plate number" },
                  year: { type: ["integer", "null"], description: "Vehicle model year, e.g. 2018" },
                  make: { type: ["string", "null"], description: "Manufacturer, e.g. Ford" },
                  model: { type: ["string", "null"], description: "Model, e.g. F-550" },
                  registration_expires: { type: ["string", "null"], description: "Registration expiry date in YYYY-MM-DD format" },
                  detected_document_type: {
                    type: "string",
                    enum: ["vin_plate", "registration", "license_plate", "vehicle", "other"],
                    description: "Type of document/subject in the image",
                  },
                },
                required: ["detected_document_type"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_truck_details" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to parse photo" }), {
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
    console.error("parse-truck-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
