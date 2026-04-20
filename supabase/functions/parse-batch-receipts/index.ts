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
  const b64 = base64Encode(bytes);
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

    const { imageUrl, imageDataUrl } = await req.json();
    if (!imageUrl && !imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageUrl or imageDataUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You extract structured data from receipt images for expense tracking in a wildland firefighting operations app.

This image may contain MULTIPLE receipts laid out together. Identify and extract data from EACH receipt separately. Return an array of receipts even if there is only one.

CRITICAL RULES FOR DESCRIPTION:
- Description must be a SHORT, TAX-FRIENDLY purpose statement (5-10 words max)
- Describe the PURPOSE of the expense, NOT the items purchased
- NEVER list individual items, line items, or products

GOOD descriptions:
- "Crew meal during fire assignment"
- "Fuel for crew truck during fire response"
- "Field equipment supplies for operations"
- "Crew lodging during wildfire deployment"
- "PPE replacement for fire crew"

BAD descriptions (NEVER do this):
- "Burger, fries, 2 sodas, extra ketchup"
- "20 gallons diesel, windshield fluid"

For category, use these mappings:
- Gas stations, fuel, diesel -> "fuel"
- Restaurants, food, groceries, meals -> "food"
- Hotels, motels, lodging -> "lodging"
- Safety gear, PPE, protective equipment -> "ppe"
- Tools, parts, hardware -> "equipment"
- Everything else -> "other"`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. It may contain multiple receipts. Extract data from each receipt separately.",
              },
              { type: "image_url", image_url: dataUrl },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipts",
              description: "Extract structured data from one or more receipt images",
              parameters: {
                type: "object",
                properties: {
                  receipts: {
                    type: "array",
                    description: "Array of extracted receipts",
                    items: {
                      type: "object",
                      properties: {
                        amount: { type: "number", description: "Total amount on the receipt" },
                        date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        category: {
                          type: "string",
                          enum: ["fuel", "ppe", "food", "lodging", "equipment", "other"],
                          description: "Expense category",
                        },
                        description: {
                          type: "string",
                          description: "Short tax-friendly purpose statement (5-10 words). NEVER list items.",
                        },
                        vendor: { type: "string", description: "Vendor/store name" },
                      },
                      required: ["amount", "category"],
                    },
                  },
                },
                required: ["receipts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipts" } },
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
      return new Response(JSON.stringify({ error: "Failed to parse receipts" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let receipts: unknown[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        receipts = Array.isArray(parsed.receipts) ? parsed.receipts : [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify({ receipts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-batch-receipts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
