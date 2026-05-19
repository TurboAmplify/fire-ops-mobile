import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Newer Supabase recovery links use PKCE: the email link redirects to
    // /reset-password?code=... and we must exchange the code for a session
    // before updateUser({ password }) works.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorDesc = url.searchParams.get("error_description") || url.hash.match(/error_description=([^&]+)/)?.[1];

    if (errorDesc) {
      setLinkError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
      return;
    }

    if (code) {
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setLinkError(
            error.message?.toLowerCase().includes("expired") || error.message?.toLowerCase().includes("invalid")
              ? "This reset link has expired or was already used. Please request a new one."
              : error.message
          );
          return;
        }
        // Clean the code out of the URL so a refresh doesn't try to reuse it.
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""));
        setReady(true);
      })();
    }

    // Fallback for legacy hash-based recovery links.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }

    // If neither a code nor a recovery hash is present, also check whether a
    // session is already established (e.g. the user came back to this tab
    // after a successful exchange in another tab).
    if (!code && !window.location.hash.includes("type=recovery")) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session) setReady(true);
      });
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (linkError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Flame className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Reset link unavailable</h1>
          <p className="text-sm text-muted-foreground">{linkError}</p>
          <Button onClick={() => navigate("/")} className="w-full touch-target">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Flame className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Set New Password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full touch-target" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
