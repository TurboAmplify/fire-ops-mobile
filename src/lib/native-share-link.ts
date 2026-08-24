/**
 * Send a link the most user-friendly way the current device allows.
 *
 * Order of preference:
 *  1. Native share sheet (packaged iOS/Android app) — user taps Messages,
 *     picks the contact, and the text is already written.
 *  2. Web Share API (mobile Safari / Chrome) — same sheet, from the browser.
 *  3. sms: link with the body pre-filled (mobile web without Web Share).
 *  4. Clipboard copy (desktop).
 */

export type ShareOutcome = "shared" | "sms" | "copied" | "failed";

function isNativeCapacitor(): boolean {
  const cap = (globalThis as any)?.Capacitor;
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

function isMobileWeb(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export async function shareLink(opts: {
  /** Message body shown in the text/email, link appended. */
  text: string;
  url: string;
  title?: string;
  /** Optional phone number to pre-address the SMS fallback. */
  phone?: string | null;
}): Promise<ShareOutcome> {
  const { text, url, title, phone } = opts;

  if (isNativeCapacitor()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: title ?? "Performance eval", text, url, dialogTitle: "Send eval link" });
      return "shared";
    } catch (err) {
      if ((err as any)?.message?.toLowerCase?.().includes("cancel")) return "shared";
      // fall through
    }
  }

  try {
    const nav: any = navigator;
    if (nav?.share) {
      await nav.share({ title: title ?? "Performance eval", text, url });
      return "shared";
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") return "shared";
    // fall through
  }

  if (isMobileWeb()) {
    const body = encodeURIComponent(`${text}\n${url}`);
    const to = phone ? phone.replace(/[^\d+]/g, "") : "";
    // iOS wants &body=, Android wants ?body= — the separator below works on both
    // when a number is present, and ?body= when it isn't.
    const href = to ? `sms:${to}${/iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?"}body=${body}` : `sms:?body=${body}`;
    window.location.href = href;
    return "sms";
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
