/**
 * Platform detection helpers.
 *
 * The FireOps HQ mobile app is wrapped (Capacitor / Despia) and loads the
 * live web app inside a WebView. OAuth flows (e.g. Apple sign-in) cannot
 * return to the app from inside that WebView and leave the user on a white
 * screen. We hide OAuth providers in any packaged-app context and only show
 * them in real browsers.
 */

/**
 * True when running inside a packaged-app WebView (Capacitor iOS/Android,
 * Despia, or a generic in-app browser). False in real desktop / mobile
 * browsers.
 */
export function isInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;

  // 1. Capacitor native platform (iOS + Android builds).
  try {
    const cap = (globalThis as any)?.Capacitor;
    if (cap?.isNativePlatform?.() === true) return true;
    if (typeof cap?.getPlatform === "function") {
      const p = cap.getPlatform();
      if (p === "ios" || p === "android") return true;
    }
  } catch {
    // ignore
  }

  const ua = navigator.userAgent || "";

  // 2. Known wrapper UA tokens.
  if (/Despia|CapacitorWebView|FireOpsApp/i.test(ua)) return true;

  // 3. iOS — hide OAuth on every iOS device. Despia's WKWebView often
  //    spoofs Safari tokens so a UA-token check is unreliable here.
  if (/iPhone|iPad|iPod/i.test(ua)) return true;

  // 4. Android in-app WebView. Real mobile browsers send a Chrome/, Firefox/,
  //    Edg/, or Samsung Browser token alongside the Android UA. WebViews
  //    typically include "wv" or omit those tokens.
  if (/Android/i.test(ua)) {
    if (/; wv\)/i.test(ua)) return true;
    const isRealAndroidBrowser =
      /Chrome\/\d/i.test(ua) ||
      /Firefox\/\d/i.test(ua) ||
      /EdgA?\/\d/i.test(ua) ||
      /SamsungBrowser\/\d/i.test(ua);
    if (!isRealAndroidBrowser) return true;
  }

  return false;
}
