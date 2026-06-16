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
  const b64 = base64Encode(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  let mime = contentType.split(";")[0].trim();
  if (!mime || mime === "application/octet-stream") {
    const lower = fileUrl.toLowerCase();
    if (lower.includes(".pdf")) mime = "application/pdf";
    else if (lower.includes(".png")) mime = "image/png";
    else if (lower.includes(".jpg") || lower.includes(".jpeg")) mime = "image/jpeg";
    else mime = "image/jpeg";
  }
  return { url: `data:${mime};base64,${b64}` };
}

function isAllowedFileUrl(fileUrl: string): boolean {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const allowedHost = new URL(supabaseUrl).host;
    const u = new URL(fileUrl);
    if (u.protocol !== "https:") return false;
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
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
    const documentId = typeof body.documentId === "string" ? body.documentId : null;
    if (!fileUrl || !isAllowedFileUrl(fileUrl)) {
      return new Response(JSON.stringify({ error: "Invalid fileUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dataUrl = await toDataUrl(fileUrl);

    const prompt = `You are reading a completed OF-286 (Emergency Equipment Use Invoice).
Extract the fields needed to build a factoring Schedule of Accounts.

Return:
- dispatch_office: The hiring/dispatch office that issued the resource order (e.g. "Bureau of Land Management", "Bureau of Indian Affairs", "U.S. Forest Service"). This becomes the SELLER on the Schedule.
- account_debtor: The paying federal/state agency. Usually the same as dispatch_office; if the form lists a separate paying agency, prefer that.
- invoice_number: The OF-286 invoice number. If absent, use the Resource Order Number, then the Agreement Number.
- invoice_amount: The SINGLE GRAND TOTAL dollar amount billed on this OF-286. This is the final "Total" / "Grand Total" / "Total Amount Due" / "Amount Claimed" value, usually in the bottom-right summary box, on the Finance Officer certification line, or in Block 28. It is ONE number that appears verbatim on the form. DO NOT add subtotals, daily totals, line-item totals, or page totals together. DO NOT sum anything. If the form shows both a subtotal and a grand total, always take the GRAND TOTAL. Numeric value only (no $ or commas).
- invoice_amount_source_text: The exact text/label next to the grand total on the form (e.g. "TOTAL AMOUNT CLAIMED", "Grand Total", "Total Due"). Used to verify you read the right field. Empty string if you cannot identify it.
- invoice_date: Date the OF-286 was signed/finalized (YYYY-MM-DD). Use the Finance Officer signature date if present, otherwise the contractor signature date, otherwise the document date.
- agreement_number: The contract/agreement number on the OF-286.
- resource_order_number: The resource order number.
- incident_name: Incident name.
- incident_number: Incident number.

CRITICAL: invoice_amount must be a value that appears verbatim on the document as the single final total. Never compute, never sum, never combine two numbers. If you cannot find a clearly-labeled grand total, return 0.

If any field is illegible or absent, return an empty string (or 0 for amounts). Never invent data.`;


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
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
              "You extract structured data from completed OF-286 invoices. Return data via the provided tool only. Never fabricate fields.",
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
              name: "extract_of286",
              description: "Extract Schedule-of-Accounts fields from an OF-286",
              parameters: {
                type: "object",
                properties: {
                  dispatch_office: { type: "string" },
                  account_debtor: { type: "string" },
                  invoice_number: { type: "string" },
                  invoice_amount: { type: "number" },
                  invoice_date: { type: "string", description: "YYYY-MM-DD" },
                  agreement_number: { type: "string" },
                  resource_order_number: { type: "string" },
                  incident_name: { type: "string" },
                  incident_number: { type: "string" },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_of286" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: Record<string, unknown> = {};
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
    }

    // Optionally cache on incident_documents
    if (documentId) {
      try {
        await supabase
          .from("incident_documents")
          .update({ of286_parsed: parsed })
          .eq("id", documentId);
      } catch (e) {
        console.warn("Failed to cache of286_parsed:", e);
      }
    }

    return new Response(JSON.stringify({ parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-of286 error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
