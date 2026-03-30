import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Shield,
  FileText,
  HelpCircle,
  Info,
  ChevronRight,
  Flame,
  Mail,
  Building2,
} from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <AppShell title="Settings">
      <div className="p-4 space-y-6">
        {/* User info */}
        <div className="rounded-xl bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
        </div>

        {/* App info */}
        <section className="space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
            About
          </h2>
          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            <InfoRow icon={Info} label="App Version" value="1.0.0" />
            <InfoRow icon={Flame} label="FireOps HQ" value="Field Operations" />
          </div>
        </section>

        {/* Legal & support */}
        <section className="space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Legal & Support
          </h2>
          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            <LinkRow
              icon={Shield}
              label="Privacy Policy"
              onClick={() => navigate("/privacy")}
            />
            <LinkRow
              icon={FileText}
              label="Terms of Use"
              onClick={() => navigate("/terms")}
            />
            <LinkRow
              icon={HelpCircle}
              label="Support & Contact"
              onClick={() => navigate("/support")}
            />
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 py-4 text-sm font-semibold text-destructive transition-transform active:scale-[0.98] touch-target"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary touch-target"
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
