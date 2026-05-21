// Shared Resend helpers (gateway-routed)
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface ResendAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

export interface SendEmailParams {
  from: string;
  to: string[];
  cc?: string[];
  reply_to?: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: ResendAttachment[];
}

export interface SendEmailResult {
  id: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") ?? Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY_1 or RESEND_API_KEY is not configured");

  const body: Record<string, unknown> = {
    from: params.from,
    to: params.to,
    subject: params.subject,
  };
  if (params.cc?.length) body.cc = params.cc;
  if (params.reply_to) body.reply_to = params.reply_to;
  if (params.html) body.html = params.html;
  if (params.text) body.text = params.text;
  if (params.headers) body.headers = params.headers;
  if (params.attachments?.length) body.attachments = params.attachments;

  const resp = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Resend send failed [${resp.status}]: ${JSON.stringify(data)}`);
  }
  return { id: data.id };
}

export const MAIL_DOMAIN = "fireopshq.com";

export function buildFromAddress(orgHandle: string, orgName: string): string {
  return `${orgName} <${orgHandle}@${MAIL_DOMAIN}>`;
}

export function buildReplyToAddress(threadToken: string): string {
  return `reply+${threadToken}@${MAIL_DOMAIN}`;
}
