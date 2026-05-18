import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const isNative = Capacitor.isNativePlatform();

if (isNative) {
  // On native iOS/Android, prevent the WebView from drawing under the status
  // bar. This is the single most reliable fix for clipped header buttons —
  // it removes the need to guess inset values via CSS.
  document.documentElement.classList.add("capacitor-native");
  (async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
    } catch {
      // StatusBar plugin not available (e.g. web preview) — safe to ignore.
    }
  })();
} else {
  // Mobile Safari / PWA / Despia-style WebView wrappers can report a zero
  // safe-area inset while still drawing under the status bar. Apply the
  // fallback class whenever we look like an iOS device OR we're running in
  // a standalone/wrapped context, so the header always clears the notch.
  const ua = navigator.userAgent || "";
  const isIOSLike = /iPhone|iPad|iPod|Despia/i.test(ua);
  const isStandalone =
    (typeof window !== "undefined" &&
      window.matchMedia?.("(display-mode: standalone)").matches) ||
    // iOS Safari "Add to Home Screen" exposes this non-standard flag.
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isIOSLike || isStandalone) {
    document.documentElement.classList.add("ios-safe-area-fallback");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
