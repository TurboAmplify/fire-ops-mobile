import { Toaster as Sonner } from "@/components/ui/sonner";
import TrainingForm from "./pages/TrainingForm";
import PublicEvalForm from "./pages/PublicEvalForm";

/**
 * Minimal shell for public, no-login routes (/training-form, /eval/:token).
 *
 * The full App tree (auth, org context, query persistence, router, tutorial)
 * is unnecessary for a no-login public form and adds seconds to first paint
 * on slow field connections. This renders the form directly.
 */
const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") : "";

const PublicFormApp = () => (
  <>
    <Sonner />
    {path.startsWith("/eval/") ? <PublicEvalForm /> : path === "/gear-form" ? <GearForm /> : <TrainingForm />}
  </>
);

export default PublicFormApp;
