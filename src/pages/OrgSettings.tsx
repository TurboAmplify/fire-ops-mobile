import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  UserPlus,
  Mail,
  Clock,
  Loader2,
  Shield,
  Flame,
  Wrench,
  User,
  Pencil,
  Check,
  X,
  ClipboardCheck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { InspectionTemplateEditor } from "@/components/fleet/InspectionTemplateEditor";
import { CrewAccessManager } from "@/components/settings/CrewAccessManager";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  crew: "Crew",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Shield,
  crew: Wrench,
};

function roleBadgeVariant(role: string) {
  switch (role) {
    case "admin":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

export default function OrgSettings() {
  const { membership, refetch: refetchOrg, isAdmin: orgIsAdmin } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("crew");
  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState("");

  const orgId = membership?.organizationId;

  // Fetch org-level feature flags
  const { data: orgRow } = useQuery({
    queryKey: ["org-row", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, inspection_alert_enabled, walkaround_enabled")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const toggleAlert = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!orgId) throw new Error("No org");
      const { error } = await supabase
        .from("organizations")
        .update({ inspection_alert_enabled: enabled })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-row", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-settings", orgId] });
      toast({ title: "Saved" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const toggleWalkaroundFeature = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!orgId) throw new Error("No org");
      const { error } = await supabase
        .from("organizations")
        .update({ walkaround_enabled: enabled } as any)
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-row", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-settings", orgId] });
      toast({ title: "Saved" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  // Fetch members (with email + name via SECURITY DEFINER RPC)
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc("list_org_members_with_identity", {
        _org_id: orgId,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.member_id,
        user_id: r.user_id,
        role: r.role,
        created_at: r.joined_at,
        email: r.email,
        profiles: { full_name: r.full_name },
      }));
    },
    enabled: !!orgId,
  });

  // Fetch pending invites
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["org-invites", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("organization_invites")
        .select("id, email, role, status, created_at, expires_at, invite_code")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Send invite mutation
  const sendInvite = useMutation({
    mutationFn: async ({
      email,
      name,
      role,
    }: {
      email: string;
      name: string;
      role: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");

      // Seat-limit check
      if (membership && membership.seatsUsed >= membership.seatLimit) {
        throw new Error(
          `Seat limit reached (${membership.seatsUsed}/${membership.seatLimit}). Upgrade your plan to add more crew.`
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const currentUserEmail = user.email?.toLowerCase().trim();

      if (normalizedEmail === currentUserEmail) {
        throw new Error("You already have access to this organization.");
      }

      const { data: existingInvite, error: lookupError } = await supabase
        .from("organization_invites")
        .select("id, status")
        .eq("organization_id", orgId)
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingInvite?.status === "accepted") {
        throw new Error("This user already has access to your organization.");
      }

      if (existingInvite?.status === "pending") {
        throw new Error("This email already has a pending invite.");
      }

      if (existingInvite) {
        const { error } = await supabase
          .from("organization_invites")
          .update({
            role,
            status: "pending",
            invited_by: user.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", existingInvite.id);

        if (error) throw error;
        return { email: normalizedEmail, mode: "resent" as const };
      }

      // invite_code is auto-generated by a DB trigger; cast to satisfy generated types
      const { error } = await supabase.from("organization_invites").insert({
        organization_id: orgId,
        email: normalizedEmail,
        role,
        invited_by: user.id,
      } as any);

      if (error) {
        if (error.code === "23505") {
          throw new Error("This user already has access to your organization.");
        }
        throw error;
      }

      return { email: normalizedEmail, mode: "created" as const };
    },
    onSuccess: ({ email, mode }) => {
      toast({
        title: mode === "resent" ? "Invite resent" : "Invite sent",
        description:
          mode === "resent"
            ? `Invitation resent to ${email}`
            : `Invitation sent to ${email}`,
      });
      setInviteEmail("");
      setInviteRole("crew");
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["org-invites", orgId] });
      refetchOrg();
    },
    onError: (err: any) => {
      const description =
        typeof err?.message === "string" &&
        err.message.includes("organization_invites_organization_id_email_key")
          ? "This person has already been invited or already has access to your organization."
          : err.message || "Something went wrong.";

      toast({
        title: "Unable to send invite",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    sendInvite.mutate({ email: inviteEmail, role: inviteRole });
  };

  const isOwner = orgIsAdmin;

  const handleSaveOrgName = async () => {
    const trimmed = orgName.trim();
    if (!trimmed || !orgId) return;
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: trimmed })
        .eq("id", orgId);
      if (error) throw error;
      toast({ title: "Updated", description: "Organization name saved." });
      setEditingName(false);
      refetchOrg();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppShell title="Organization">
      <div className="p-4 space-y-6">
        {/* Org header */}
        <div className="rounded-xl bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveOrgName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <button onClick={handleSaveOrgName} className="text-primary touch-target">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingName(false)} className="text-muted-foreground touch-target">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold truncate">
                {membership?.organizationName ?? "—"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Your role: {ROLE_LABELS[membership?.role ?? ""] ?? membership?.role}
              {membership && (
                <> · {membership.seatsUsed}/{membership.seatLimit} seats used</>
              )}
            </p>
          </div>
          {isOwner && !editingName && (
            <button
              onClick={() => {
                setOrgName(membership?.organizationName ?? "");
                setEditingName(true);
              }}
              className="text-muted-foreground touch-target"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Members */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Members ({members.length})
            </h2>
          </div>

          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No members yet
              </div>
            ) : (
              members.map((m: any) => {
                const RoleIcon = ROLE_ICONS[m.role] ?? User;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                      <RoleIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {m.profiles?.full_name?.trim() || m.email || "Unknown user"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          m.user_id === user?.id ? "You" : null,
                          m.profiles?.full_name?.trim() && m.email ? m.email : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Badge variant={roleBadgeVariant(m.role)}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Pending invites */}
        {isOwner && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Pending Invites ({invites.length})
              </h2>
            </div>

            <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
              {invitesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : invites.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No pending invites
                </div>
              ) : (
                invites.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 shrink-0">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                      {inv.invite_code && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inv.invite_code);
                            toast({ title: "Copied", description: `Invite code ${inv.invite_code} copied.` });
                          }}
                          className="mt-1 inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-mono text-xs tracking-wider text-foreground active:bg-accent"
                          title="Tap to copy"
                        >
                          {inv.invite_code}
                          <ClipboardCheck className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Badge variant={roleBadgeVariant(inv.role)}>
                      {ROLE_LABELS[inv.role] ?? inv.role}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Invite button */}
        {isOwner && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="w-full touch-target" size="lg">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="crew@example.com"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="crew">Crew</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inviteRole === "admin"
                      ? "Full access to manage everything in the organization."
                      : "Restricted to trucks an admin grants them access to."}
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full touch-target"
                  disabled={sendInvite.isPending}
                >
                  {sendInvite.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Inspections */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Walk-Around Inspections
            </h2>
          </div>

          <div className="rounded-xl bg-card p-4 space-y-4">
            {/* Master feature toggle (admin only) */}
            {isOwner && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Walk-around feature</p>
                  <p className="text-xs text-muted-foreground">
                    Turn the entire walk-around inspection feature on or off for everyone in your organization.
                  </p>
                </div>
                <Switch
                  checked={orgRow?.walkaround_enabled !== false}
                  onCheckedChange={(v) => toggleWalkaroundFeature.mutate(v)}
                  disabled={toggleWalkaroundFeature.isPending}
                />
              </div>
            )}

            {orgRow?.walkaround_enabled !== false && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Daily walk-around alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Show a banner on the dashboard when a deployed truck&apos;s walk-around is due.
                    </p>
                  </div>
                  <Switch
                    checked={!!orgRow?.inspection_alert_enabled}
                    onCheckedChange={(v) => toggleAlert.mutate(v)}
                    disabled={toggleAlert.isPending}
                  />
                </div>

                {isOwner && (
                  <div className="border-t pt-4">
                    <InspectionTemplateEditor />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Crew Truck Access (admin only) */}
        {isOwner && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Crew Truck Access
              </h2>
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              Choose which trucks each crew member can see and use. Admins always see all trucks.
            </p>
            <CrewAccessManager />
          </section>
        )}
      </div>
    </AppShell>
  );
}
