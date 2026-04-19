import { AppShell } from "@/components/AppShell";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <AppShell title="Terms of Use">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-extrabold">Terms of Use</h2>
        </div>

        <div className="rounded-xl bg-card p-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Effective Date:</strong> April 19, 2026
          </p>

          <p>
            By using FireOps HQ ("the App"), you agree to these Terms of Use. If you do not
            agree, do not use the App.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Use of the App</h3>
          <p>
            The App is intended for operational use by wildland firefighting contractors and
            personnel. You agree to use the App only for its intended purpose and in compliance
            with applicable laws.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Account Responsibility</h3>
          <p>
            You are responsible for maintaining the security of your account credentials and for
            all activity under your account.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Data Accuracy</h3>
          <p>
            You are responsible for the accuracy of data you enter. The App is a tracking tool
            and does not replace official records or certifications.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Limitation of Liability</h3>
          <p>
            The App is provided "as is" without warranties. We are not liable for data loss,
            operational decisions made using the App, or any indirect damages.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Changes</h3>
          <p>
            We may update these terms at any time. Continued use constitutes acceptance of
            updated terms.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Contact</h3>
          <p>
            Questions? Email{" "}
            <a href="mailto:support@fireopshq.com" className="text-primary underline">
              support@fireopshq.com
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
