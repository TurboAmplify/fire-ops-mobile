import { AppShell } from "@/components/AppShell";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";

export default function Support() {
  return (
    <AppShell title="Support">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-extrabold">Support & Contact</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Need help with FireOps HQ? Reach out to our support team and we'll get
          back to you as quickly as possible.
        </p>

        <div className="space-y-3">
          <a
            href="mailto:support@fireopshq.com"
            className="flex items-center gap-3 rounded-xl bg-card p-4 transition-transform active:scale-[0.98] touch-target"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Email Support</p>
              <p className="text-xs text-muted-foreground">support@fireopshq.com</p>
            </div>
          </a>

          <div className="rounded-xl bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Response Time</p>
              <p className="text-xs text-muted-foreground">
                We typically respond within 24 hours
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
          <p className="text-sm font-semibold">Frequently Asked Questions</p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">How do I reset my password?</p>
              <p className="text-muted-foreground">
                Use the "Forgot password?" link on the sign-in screen to receive a reset email.
              </p>
            </div>
            <div>
              <p className="font-medium">How do I add a receipt photo?</p>
              <p className="text-muted-foreground">
                When creating or editing an expense, tap "Take or attach photo" to use your
                camera or select from your photo library.
              </p>
            </div>
            <div>
              <p className="font-medium">Can I use the app offline?</p>
              <p className="text-muted-foreground">
                The app requires an internet connection for data sync. Offline support
                is planned for a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
