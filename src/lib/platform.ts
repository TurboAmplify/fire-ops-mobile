/**
 * Platform detection helpers.
 *
 * The FireOps HQ iOS app is wrapped with Despia, which loads the live web app
 * in a WKWebView. That wrapper does not register the OAuth callback as a
 * Universal Link, so any OAuth flow (e.g. Apple sign-in) cannot return to the
 * app and leaves the user on a white screen.
 *
 * Until Despia is configured for Universal Links, we hide OAuth providers
 * inside the in-app WebView and only show them in real browsers.
 */

/**
 * True when running inside an iOS in-app WebView (Despia / WKWebView).
 *
 * Detection: iOS user agent (iPhone/iPad/iPod) that does NOT contain the
 * `Safari/` token. Real Mobile Safari always sends `Safari/`; WKWebView
 * shells (Despia, Capacitor, in-app browsers) omit it.
 */
export function isInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Hide OAuth on ALL iOS devices until Despia is configured for Universal
  // Links. Despia's WebView often spoofs `Safari/` in its UA, so a
  // token-based check is unreliable. iOS users sign in with email + password.
  return /iPhone|iPad|iPod/i.test(ua);
}
