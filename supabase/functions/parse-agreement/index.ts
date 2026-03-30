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

    const prompt = `You are a document parser for wildland firefighting agreements and contracts.
Analyze the uploaded document and extract structured data to create an incident and truck assignment.

Extract ALL of the following fields if present:
- incident_name: Name of the fire/incident
- incident_location: Location of the incident
- incident_type: Type (wildfire, prescribed, structure, other)
- agreement_number: The agreement or contract number
- resource_order_number: Resource order number(s)
- truck_name: Name or identifier of the truck/unit/engine being assigned (e.g. "DL31", "Engine 61")
- start_date: Start date or reporting date
- end_date: End or demob date
- reporting_location: Where to report
- shift_start_time: Default shift start time
- shift_end_time: Default shift end time
- special_instructions: Any special instructions
- additional_data: Any other key-value pairs of operational identifiers

The document file name is: ${fileName}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured data from firefighting agreement documents. Return data using the provided tool." },
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
              name: "extract_agreement",
              description: "Extract structured data from a firefighting agreement document",
              parameters: {
                type: "object",
                properties: {
                  incident_name: { type: "string", description: "Name of the incident/fire" },
                  incident_location: { type: "string", description: "Location of the incident" },
                  incident_type: { type: "string", enum: ["wildfire", "prescribed", "structure", "other"], description: "Type of incident" },
                  agreement_number: { type: "string", description: "Agreement or contract number" },
                  resource_order_number: { type: "string", description: "Resource order number" },
                  truck_name: { type: "string", description: "Truck/unit/engine identifier" },
                  start_date: { type: "string", description: "Start or reporting date (YYYY-MM-DD)" },
                  end_date: { type: "string", description: "End or demob date (YYYY-MM-DD)" },
                  reporting_location: { type: "string", description: "Where to report" },
                  shift_start_time: { type: "string", description: "Default shift start time" },
                  shift_end_time: { type: "string", description: "Default shift end time" },
                  special_instructions: { type: "string", description: "Special instructions" },
                  additional_data: {
                    type: "object",
                    description: "Other key-value pairs",
                    additionalProperties: { type: "string" },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_agreement" } },
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
      return new Response(JSON.stringify({ error: "Failed to parse agreement" }), {
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
    console.error("parse-agreement error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
