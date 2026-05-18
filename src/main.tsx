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
} else if (/iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
  // Mobile Safari / PWA fallback when env(safe-area-inset-top) is unreliable.
  document.documentElement.classList.add("ios-safe-area-fallback");
}

createRoot(document.getElementById("root")!).render(<App />);
