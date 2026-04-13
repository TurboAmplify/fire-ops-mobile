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
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  crew_boss: "Crew Boss",
  crew_member: "Crew Member",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Shield,
  crew_boss: Flame,
  crew_member: Wrench,
};

function roleBadgeVariant(role: string) {
  switch (role) {
    case "owner":
      return "default" as const;
    case "crew_boss":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function OrgSettings() {
  const { membership, refetch: refetchOrg } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("crew_member");
  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState("");

  const orgId = membership?.organizationId;

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, created_at, profiles(full_name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
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
        .select("id, email, role, status, created_at, expires_at")
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
      role,
    }: {
      email: string;
      role: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");

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

      const { error } = await supabase.from("organization_invites").insert({
        organization_id: orgId,
        email: normalizedEmail,
        role,
        invited_by: user.id,
      });

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
      setInviteRole("crew_member");
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["org-invites", orgId] });
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

  const isOwner = membership?.role === "owner";

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
                        {m.profiles?.full_name || "Unnamed User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.user_id === user?.id ? "You" : ""}
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
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
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="crew_boss">Crew Boss</SelectItem>
                      <SelectItem value="crew_member">Crew Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inviteRole === "owner"
                      ? "Full access to manage the organization"
                      : inviteRole === "crew_boss"
                      ? "Can manage incidents, crews, and operations"
                      : "Can view and log time and expenses"}
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
      </div>
    </AppShell>
  );
}
