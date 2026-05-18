import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (/iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
  document.documentElement.classList.add("ios-safe-area-fallback");
}

createRoot(document.getElementById("root")!).render(<App />);
