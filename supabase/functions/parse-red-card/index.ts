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
  const b64 = base64Encode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
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
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, imageDataUrl } = await req.json();
    if (!imageUrl && !imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageUrl or imageDataUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dataUrl: { url: string };
    if (imageDataUrl) {
      if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:")) {
        return new Response(JSON.stringify({ error: "imageDataUrl must be a data: URL" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (imageDataUrl.length > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "imageDataUrl too large" }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      dataUrl = { url: imageDataUrl };
    } else {
      if (!isAllowedFileUrl(imageUrl)) {
        return new Response(JSON.stringify({ error: "imageUrl must be a Supabase Storage URL" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      dataUrl = await toDataUrl(imageUrl);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const tool = {
      type: "function",
      function: {
        name: "extract_red_card",
        description: "Extract fields from a Red Card / Incident Qualification Card",
        parameters: {
          type: "object",
          properties: {
            card_id: { type: "string" },
            agency: { type: "string" },
            primary_position: { type: "string" },
            work_capacity_test: { type: "string", description: "Arduous, Moderate, or Light" },
            fitness_test_date: { type: "string", description: "ISO date YYYY-MM-DD" },
            rt130_refresher_status: { type: "string", description: "Current, Expired, or Pending" },
            issue_date: { type: "string", description: "ISO date YYYY-MM-DD" },
            review_expiration_date: { type: "string", description: "ISO date YYYY-MM-DD" },
            signer_name: { type: "string" },
            signer_title: { type: "string" },
            restrictions_notes: { type: "string" },
            emergency_contact_name: { type: "string" },
            emergency_contact_relation: { type: "string" },
            emergency_contact_phone: { type: "string" },
            return_address: { type: "string" },
            qualifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  qualification: { type: "string" },
                  code: { type: "string" },
                  status: { type: "string", description: "Qualified, Trainee, Complete, Current, Expired, etc." },
                },
                required: ["qualification", "code", "status"],
              },
            },
          },
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You extract structured data from wildland firefighter Red Cards (Incident Qualification Cards). " +
              "These cards may have a front (identity + fitness + dates + signer) and a back (qualifications table, " +
              "restrictions, emergency contact, return-to). Read every field carefully. Dates must be YYYY-MM-DD. " +
              "Omit fields you cannot read clearly. Call the extract_red_card tool with what you find.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all visible fields from this Red Card image." },
              { type: "image_url", image_url: dataUrl },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_red_card" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await response.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: Record<string, unknown> = {};
    if (call?.function?.arguments) {
      try { parsed = JSON.parse(call.function.arguments); } catch { parsed = {}; }
    }

    return new Response(JSON.stringify({ parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
