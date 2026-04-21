import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useTheme } from "@/hooks/useTheme";
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
  Sun,
  Moon,
  SlidersHorizontal,
  Trash2,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NavBarCustomizer } from "@/components/settings/NavBarCustomizer";
import { useTutorial } from "@/hooks/useTutorial";
import pkg from "../../package.json";

const APP_VERSION = (pkg as { version?: string }).version || "1.0.0";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { membership, memberships, setActiveOrgId } = useOrganization();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { start: startTutorial } = useTutorial();
  const [showNavCustomizer, setShowNavCustomizer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      // Edge function returns { error: "..." } in body when the DB refuses
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }

      toast({ title: "Account deleted", description: "Your account and data have been removed." });
      await signOut();
      navigate("/login");
    } catch (err: any) {
      console.error("Delete account error:", err);
      const message =
        err?.message?.includes("only admin") || err?.message?.includes("operational records")
          ? err.message
          : "Failed to delete account. Please try again.";
      toast({ title: "Cannot delete account", description: message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AppShell title="Settings">
      <div className="p-4 space-y-5">
        {/* User info */}
        <div className="rounded-2xl bg-card p-4 flex items-center gap-3 card-shadow">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
            <Mail className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.email ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">Signed in</p>
          </div>
        </div>

        {/* Organization */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Organization
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <LinkRow
              icon={Building2}
              label={membership?.organizationName ?? "Organization"}
              onClick={() => navigate("/settings/organization")}
            />
            {memberships.length > 1 && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Switch active org
                </p>
                <div className="flex flex-col gap-1.5">
                  {memberships.map((m) => {
                    const active = m.organizationId === membership?.organizationId;
                    return (
                      <button
                        key={m.organizationId}
                        onClick={() => setActiveOrgId(m.organizationId)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors touch-target ${
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background hover:bg-accent"
                        }`}
                      >
                        <span className="truncate font-medium">{m.organizationName}</span>
                        <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {m.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Appearance
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/50 touch-target"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 text-accent-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-accent-foreground" />
                )}
              </div>
              <span className="flex-1 text-sm">Theme</span>
              <span className="text-sm text-muted-foreground capitalize">{theme}</span>
            </button>
            <LinkRow
              icon={SlidersHorizontal}
              label="Customize Nav Bar"
              onClick={() => setShowNavCustomizer(true)}
            />
          </div>
        </section>

        {/* App info */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            About
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <InfoRow icon={Info} label="App Version" value={APP_VERSION} />
            <InfoRow icon={Flame} label="FireOps HQ" value="Field Operations" />
          </div>
        </section>

        {/* Help */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Help
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
            <LinkRow
              icon={PlayCircle}
              label="Replay Tutorial"
              onClick={startTutorial}
            />
          </div>
        </section>

        {/* Legal & support */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Legal & Support
          </h2>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/60 card-shadow">
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
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-destructive/8 py-4 text-sm font-semibold text-destructive transition-all duration-150 active:scale-[0.98] active:bg-destructive/15 touch-target"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

        {/* Delete Account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/20 py-4 text-sm font-semibold text-destructive/70 transition-all duration-150 active:scale-[0.98] touch-target"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        ) : (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">Are you sure?</p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete your account and remove you from any organizations you belong to. This action cannot be undone.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> If you are the only admin of an organization with active records, deletion will be refused. You must promote another admin first, or contact support to remove the organization.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold transition-all active:scale-[0.98] touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground transition-all active:scale-[0.98] touch-target"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        )}
      </div>
      <NavBarCustomizer open={showNavCustomizer} onOpenChange={setShowNavCustomizer} />
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0">
        <Icon className="h-4 w-4 text-accent-foreground" />
      </div>
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
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/50 touch-target"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0">
        <Icon className="h-4 w-4 text-accent-foreground" />
      </div>
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </button>
  );
}
