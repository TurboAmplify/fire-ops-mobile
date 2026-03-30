import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const prompt = `You are a document parser for wildland firefighting resource orders. 
Analyze the uploaded document and extract structured data.

Extract ALL of the following fields if present:
- agreement_number: The agreement or contract number
- resource_order_number: The resource order number(s)
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

The document file name is: ${fileName}
The document URL is: ${fileUrl}

Please analyze any text content you can extract from this document.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured data from firefighting resource order documents. Return data using the provided tool." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: fileUrl } },
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
                  agreement_number: { type: "string", description: "Agreement or contract number" },
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to parse document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
