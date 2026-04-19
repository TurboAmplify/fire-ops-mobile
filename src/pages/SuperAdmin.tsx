import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Building2, Users, Activity, AlertTriangle, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Organizations",
    description: "All orgs, tier, seats, last activity",
    icon: Building2,
    to: "/super-admin/organizations",
    ready: true,
  },
  {
    title: "Users",
    description: "Search users, see org memberships",
    icon: Users,
    to: "/super-admin/users",
    ready: false,
  },
  {
    title: "Activity feed",
    description: "Signups, org creations, invites accepted",
    icon: Activity,
    to: "/super-admin/activity",
    ready: false,
  },
  {
    title: "Errors",
    description: "Crash reports and edge function failures",
    icon: AlertTriangle,
    to: "/super-admin/errors",
    ready: false,
  },
  {
    title: "Audit log",
    description: "Every super-admin action you take",
    icon: FileText,
    to: "/super-admin/audit",
    ready: false,
  },
];

export default function SuperAdmin() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Cross-org platform operations</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          Step 1 complete: platform_admin gate active. Read-only org and user views ship next.
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const Icon = s.icon;
            const inner = (
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {!s.ready && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Coming next
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-3 text-base">{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            );
            return s.ready ? (
              <Link key={s.to} to={s.to}>
                {inner}
              </Link>
            ) : (
              <div key={s.to} className="cursor-not-allowed opacity-70">
                {inner}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
