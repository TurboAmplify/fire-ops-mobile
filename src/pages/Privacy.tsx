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
            <strong className="text-foreground">Effective Date:</strong> April 19, 2026
          </p>

          <p>
            FireOps HQ ("the App", "we", "us") is designed to help wildland firefighting
            contractors manage incidents, crews, time tracking, and expenses in the field.
            This policy explains what we collect, how we use it, and your rights.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Information We Collect</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Account information:</strong> email address
              and password (for authentication), and your full name if provided.
            </li>
            <li>
              <strong className="text-foreground">Operational data:</strong> incidents, crew
              assignments, shifts, expenses, receipt images, truck and inspection photos,
              signatures, and any documents you upload.
            </li>
            <li>
              <strong className="text-foreground">Device information:</strong> basic technical
              data (device type, OS version, app version) used for app functionality and
              error diagnosis.
            </li>
            <li>
              <strong className="text-foreground">Camera and Photos:</strong> when you choose
              to take or attach a photo, we access your camera or photo library only for that
              action. We do not browse your library in the background.
            </li>
          </ul>

          <h3 className="text-foreground font-semibold pt-2">How We Use Your Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain the App's functionality</li>
            <li>To authenticate your identity and secure your account</li>
            <li>To store and display your operational data within your organization</li>
            <li>To extract data from receipts and documents you upload (see "Third Parties")</li>
          </ul>

          <h3 className="text-foreground font-semibold pt-2">Third Parties</h3>
          <p>
            We use the following service providers to run the App. They process data only
            as needed to deliver the service and are bound by their own privacy policies:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Supabase</strong> — hosts your account,
              database, and uploaded files.
            </li>
            <li>
              <strong className="text-foreground">Lovable AI Gateway / Google Gemini</strong>
              {" "}— when you scan a receipt, agreement, or resource order, the image or
              document is sent to Google's Gemini model through Lovable's AI gateway to
              extract structured data (vendor, amount, dates, etc.). Files are not used to
              train any model.
            </li>
          </ul>
          <p>
            We do not sell your personal information. We do not share your operational data
            with anyone outside your organization, except as required by law.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Data Storage & Security</h3>
          <p>
            Your data is stored securely using industry-standard encryption in transit
            (HTTPS) and at rest. Access is enforced by per-organization row-level security:
            users can only see data belonging to organizations they are a member of.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Account Deletion</h3>
          <p>
            You can delete your account at any time from <em>Settings → Delete Account</em>.
            Deletion removes your profile and your membership in any organizations.
            If you are the sole admin of an organization that contains operational records,
            you must either transfer ownership to another admin first, or contact support
            to delete the organization. This protects against accidental loss of records
            that other team members may rely on.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Your Rights</h3>
          <p>
            You may request a copy of your data, correction of inaccurate data, or
            deletion of your account at any time by contacting our support team.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Children's Privacy</h3>
          <p>
            FireOps HQ is a professional tool intended for adult firefighting personnel.
            It is not directed at, marketed to, or intended for children under 13. We do not
            knowingly collect data from children under 13. If you believe a child has
            provided us with information, contact us and we will delete it.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Changes to This Policy</h3>
          <p>
            We may update this policy from time to time. The "Effective Date" above will
            reflect the most recent revision. Continued use of the App after changes
            constitutes acceptance of the updated policy.
          </p>

          <h3 className="text-foreground font-semibold pt-2">Contact</h3>
          <p>
            For privacy questions or to request data access or deletion, email{" "}
            <a href="mailto:support@fireopshq.com" className="text-primary underline">
              support@fireopshq.com
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
