import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import TrainingForm from "./pages/TrainingForm";
import PublicEvalForm from "./pages/PublicEvalForm";
import GearForm from "./pages/GearForm";

/**
 * Minimal shell for public, no-login routes (/training-form, /eval/:token).
 *
 * The full App tree (auth, org context, query persistence, router, tutorial)
 * is unnecessary for a no-login public form and adds seconds to first paint
 * on slow field connections. This renders the form directly.
 */
const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") : "";

// Lightweight client for public forms — no persistence or auth-aware retries.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const PublicFormApp = () => (
  <QueryClientProvider client={queryClient}>
    <Sonner />
    {path.startsWith("/eval/") ? <PublicEvalForm /> : path === "/gear-form" ? <GearForm /> : <TrainingForm />}
  </QueryClientProvider>
);

export default PublicFormApp;
