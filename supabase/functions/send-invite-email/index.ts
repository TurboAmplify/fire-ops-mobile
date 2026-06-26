import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendEmail, buildFromAddress } from '../_shared/resend.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { to, name, code, orgName, orgHandle } = await req.json();
    if (!to || !code) {
      return new Response(JSON.stringify({ error: 'to and code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const from = buildFromAddress(orgHandle || 'dry-lightning-wildland-firef', orgName || 'Dry Lightning Wildland Firefighters');
    const appUrl = 'https://app.fireopshq.com';

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5">
        <h2 style="color:#c0392b;margin-bottom:8px">Welcome to FireOps HQ, ${name || ''}</h2>
        <p>You've been added to <strong>${orgName || 'Dry Lightning'}</strong>. Here's how to get set up on your Android phone — takes about a minute.</p>

        <h3 style="margin-top:24px">1. Open the app</h3>
        <p>On your Android phone, open Chrome and go to:</p>
        <p><a href="${appUrl}" style="color:#c0392b;font-weight:600">${appUrl}</a></p>

        <h3 style="margin-top:24px">2. Add it to your home screen</h3>
        <p>In Chrome, tap the <strong>⋮ menu</strong> in the top right, then tap <strong>"Add to Home screen"</strong>. This gives you an app icon you can tap any time — just like a regular app.</p>

        <h3 style="margin-top:24px">3. Sign up</h3>
        <p>Open it from your home screen, tap <strong>"Join your team"</strong>, and enter:</p>
        <ul>
          <li><strong>Name:</strong> ${name || 'John Orban'}</li>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Password:</strong> (pick one, at least 8 characters)</li>
          <li><strong>Invite code:</strong> <span style="font-family:monospace;background:#f4f4f4;padding:2px 8px;border-radius:4px;font-size:16px">${code}</span></li>
        </ul>

        <p style="margin-top:24px">That's it — you'll be in. Any trouble, just reply to this email.</p>

        <p style="margin-top:24px;color:#666;font-size:13px">Dustin / Dry Lightning Wildland Firefighters</p>
      </div>
    `;

    const text = `Welcome to FireOps HQ, ${name || ''}\n\nGet set up on your Android phone:\n\n1. Open Chrome and go to ${appUrl}\n2. Tap the ⋮ menu, then "Add to Home screen"\n3. Open it from your home screen, tap "Join your team", and enter:\n   - Name: ${name || 'John Orban'}\n   - Email: ${to}\n   - Password: (at least 8 characters)\n   - Invite code: ${code}\n\nReply to this email if you need help.\n\nDustin / Dry Lightning Wildland Firefighters`;

    const result = await sendEmail({
      from,
      to: [to],
      subject: `Your FireOps HQ invite code: ${code}`,
      html,
      text,
    });

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
