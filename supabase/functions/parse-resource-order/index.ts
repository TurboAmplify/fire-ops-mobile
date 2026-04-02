import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    if (lower.includes(".pdf")) mime = "application/pdf";
    else if (lower.includes(".png")) mime = "image/png";
    else if (lower.includes(".jpg") || lower.includes(".jpeg")) mime = "image/jpeg";
    else if (lower.includes(".webp")) mime = "image/webp";
    else mime = "application/pdf";
  }
  return { url: `data:${mime};base64,${b64}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileUrl, fileName } = await req.json();
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dataUrl = await toDataUrl(fileUrl);

    const prompt = `You are a document parser for wildland firefighting resource orders. 
Analyze the uploaded document and extract structured data.

IMPORTANT: Carefully examine the ENTIRE document including headers, footers, stamps, and fine print at the bottom. 
Contract numbers, agreement numbers, and financial codes are often found at the BOTTOM of resource orders, 
sometimes in small print, stamps, or handwritten notes.

Look for these common label patterns:
- "Contract Num" or "Contract #" or "Agreement #" — this is the agreement_number
- "PN" followed by codes like "SL4V (1542)" — this is the financial_code
- "CLIN" — CLIN number
- Any alphanumeric code that looks like a contract (e.g. 1202SB25T7700)

Extract ALL of the following fields if present:
- agreement_number: The agreement, contract number, or "Contract Num" (e.g. 1202SB25T7700). CHECK THE BOTTOM OF THE DOCUMENT.
- resource_order_number: The resource order number(s)
- financial_code: The financial code or "PN" code (e.g. PN SL4V (1542)). Often near bottom or in stamps.
- contract_number: The contract number if separate from agreement number
- clin: CLIN number if present
- ordering_unit: The ordering unit/agency
- reporting_location: Where to report
- reporting_date: When to report
- demob_date: Expected demobilization date
- resource_type: Type of resource (engine, crew, etc.)
- resource_name: Name/identifier of the resource
- incident_name: Name of the incident
- incident_number: Incident number
- operational_period: Current operational period
- shift_start_time: Default shift start time if specified
- shift_end_time: Default shift end time if specified
- special_instructions: Any special instructions
- additional_identifiers: Any other operational identifiers as key-value pairs

The document file name is: ${fileName}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You extract structured data from firefighting resource order documents. Return data using the provided tool." },
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
              name: "extract_resource_order",
              description: "Extract structured data from a resource order document",
              parameters: {
                type: "object",
                properties: {
                  agreement_number: { type: "string", description: "Agreement or contract number (Contract Num)" },
                  financial_code: { type: "string", description: "Financial code / PN code" },
                  contract_number: { type: "string", description: "Contract number if labeled separately" },
                  clin: { type: "string", description: "CLIN number" },
                  resource_order_number: { type: "string", description: "Resource order number" },
                  ordering_unit: { type: "string", description: "Ordering unit or agency" },
                  reporting_location: { type: "string", description: "Where to report" },
                  reporting_date: { type: "string", description: "When to report (date)" },
                  demob_date: { type: "string", description: "Demobilization date" },
                  resource_type: { type: "string", description: "Type of resource" },
                  resource_name: { type: "string", description: "Name/identifier of the resource" },
                  incident_name: { type: "string", description: "Name of the incident" },
                  incident_number: { type: "string", description: "Incident number" },
                  operational_period: { type: "string", description: "Current operational period" },
                  shift_start_time: { type: "string", description: "Default shift start time" },
                  shift_end_time: { type: "string", description: "Default shift end time" },
                  special_instructions: { type: "string", description: "Special instructions" },
                  additional_identifiers: {
                    type: "object",
                    description: "Any other key-value pairs of operational identifiers",
                    additionalProperties: { type: "string" },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_resource_order" } },
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
      return new Response(JSON.stringify({ error: "Failed to parse document" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let parsed = {};
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
    console.error("parse-resource-order error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
