import { Flame, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Shown when the user's organization is suspended or closed.
 *
 * Apple-safe copy: no mention of billing, payment, subscription, or any
 * external URL. Owners get a slightly more useful hint pointing to email,
 * members get a generic "contact your administrator" message.
 */
export default function AccountUnavailable() {
  const { signOut } = useAuth();
  const { membership } = useOrganization();
  const isOwner = membership?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Flame className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Account unavailable</h1>
          {isOwner ? (
            <p className="text-sm text-muted-foreground">
              There's an issue with your account. Please check your email for details
              from your administrator.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This account is currently unavailable. Please contact your team
              administrator.
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => signOut()} className="w-full touch-target">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
