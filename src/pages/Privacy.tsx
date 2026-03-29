import { AppShell } from "@/components/AppShell";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <AppShell title="Privacy Policy">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-extrabold">Privacy Policy</h2>
        </div>

        <div className="rounded-xl bg-card p-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Effective Date:</strong> March 29, 2026
          </p>

          <p>
            FireOps HQ ("the App") is designed to help wildland firefighting contractors manage
            incidents, crews, time tracking, and expenses in the field.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Information We Collect</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information: email address and password (for authentication)</li>
            <li>Operational data: incidents, crew assignments, shifts, expenses, and receipt images you enter</li>
            <li>Device information: basic technical data for app functionality</li>
          </ul>

          <h3 className="text-foreground font-semibold pt-2">How We Use Your Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain the App's functionality</li>
            <li>To authenticate your identity and secure your account</li>
            <li>To store and display your operational data</li>
          </ul>

          <h3 className="text-foreground font-semibold pt-2">Data Storage & Security</h3>
          <p>
            Your data is stored securely using industry-standard encryption and access controls.
            We do not sell, share, or distribute your personal information to third parties.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Your Rights</h3>
          <p>
            You may request deletion of your account and associated data at any time by
            contacting our support team.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Contact</h3>
          <p>
            For privacy questions, email{" "}
            <a href="mailto:support@fireopshq.com" className="text-primary underline">
              support@fireopshq.com
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
