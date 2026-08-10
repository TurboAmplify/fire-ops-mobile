import { Toaster as Sonner } from "@/components/ui/sonner";
import TrainingForm from "./pages/TrainingForm";

/**
 * Minimal shell for the public /training-form route.
 *
 * The full App tree (auth, org context, query persistence, router, tutorial)
 * is unnecessary for a no-login public form and adds seconds to first paint
 * on slow field connections. This renders the form directly.
 */
const PublicFormApp = () => (
  <>
    <Sonner />
    <TrainingForm />
  </>
);

export default PublicFormApp;
